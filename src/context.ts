import type { Fn, StringKeys, StringOf } from 'everyday-types'

import { EventEmitter } from 'eventemitter-strict'
import { argtor } from 'argtor'
import { chain, Off, onAll, queue, QueueOptions, wrapQueue } from 'event-toolkit'
import { accessors, entries, fromEntries, pick, removeFromArray } from 'everyday-utils'
import { bool, Fluent, toFluent } from 'to-fluent'

import { applyFluentCapture, FluentCapture, FluentCaptureSymbol } from 'proxy-toolkit'
import type { Attrs } from './attrs'

const NO_DEPS = Symbol()
const REDUCER = Symbol()

export class EffectOptions<T> extends QueueOptions {
  cb?: (value: any) => boolean | void
  keys?: Set<StringKeys<T>>
  why = bool
  once = bool
  lock = bool
  isFulfillReducer = bool
}

export type Deps<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

export type FxDeps<T> = {
  [K in keyof Attrs<T>]-?: NonNullable<Attrs<T>[K]>
}

export type FxFn<T, R> = (deps: FxDeps<T>) => R
export type CtxFn<T, R> = (ctx: T) => R
export type FxRet<R> = Promise<R> | (() => Promise<R>) | R | void

export type FluentFx<T, R, U, D = void> = Fluent<(fn: FxFn<T, R>, def: D) => U, Required<EffectOptions<T>>>

export type OffEffect = () => Promise<void>

export interface FxDef<T, R = void | unknown> {
  fn: FxFn<T, FxRet<R>> | CtxFn<T, FxRet<R>>
  cb?: ((value: any) => boolean | void) | undefined
  keys?: Set<StringKeys<T>>
  dispose?: (() => void) | null
  options?: EffectOptions<T>
  origin?: Error[]
  initial?: R
}

export interface Fx<T, R = void | unknown> extends FxDef<T, R> { }

export class Fx<T, R = void | unknown> {
  remove?: () => Promise<void>
  target?: keyof T
  values = {} as T
  pass?: boolean
  origin: Error[] = []
  originExtra?: Error[] | null

  constructor(fx: FxDef<T, R>) {
    Object.assign(this, fx)
  }
}

export type Context<T extends object> = T & ContextClass<T>

export let GlobalLock: any

export interface ContextEvents {
  update: (props: { origin: Error[], changedKeys: string[], f: Fx<any, any> }) => void
  flush: () => void
}

export class ContextClass<T extends object> extends EventEmitter<ContextEvents> {
  private entries!: readonly [StringOf<keyof T>, T[keyof T]][]
  private mem!: Record<StringOf<keyof T>, T[keyof T]>
  private keys = new Set<StringOf<keyof T>>()

  private effects!: Map<keyof T | symbol, Fx<T>[]>
  private triggered = new Set<Fx<T>>()
  tailQueue = new Set<Fn<any, any>>()

  active: Fx<T, any>[] = []
  private reducer?: Fx<T>

  public $ = {} as Context<T>

  private scheduled = new Set<{
    key: keyof T;
    value?: [string, any[]];
    captured?: FluentCapture
  }>()
  private fxListeners = new Map<keyof T, [any, Off]>()

  static attach<T extends object & { $?: Context<T>; context?: ContextClass<T> }>(target: T, extension: any = {}) {
    if (target.context instanceof ContextClass) {
      // TODO: what should be the behavior here?
      return
    }
    //!? 'attach context to target', target
    target.context = new ContextClass(target)

    // We are using mutate() to extend $ because at this point there are
    // reactive effects that will trigger and depend on the $ object to be fulfilled,
    // along with its extension. We pass the extension from the caller because we
    // want to be environment agnostic and in the DOM context, the extension contains
    // DOM initializers that don't exist in Workers and we want the context to be
    // able to work in both environments.
    target.context.mutate(() => {
      target.$ = Object.assign(target.context!.$ as any, extension)
    })
  }

  debug = false

  constructor(private target: T) {
    super()
    if ((this.target as any).debug || this.debug) {
      this.debug = true
      this.startDebugging()
    }
    this.copyMethods()
    this.createMemory()
    this.createAccessors()
    this.cleanup()
  }

  setupScheduled() {
    for (const item of this.scheduled) {
      if (item.value) {
        const { key, value: [method, args] } = item
        this.$[key] = (this as any).$[method](...args)
      } else if (item.captured) {
        const { key, captured } = item
        this._origin = captured.origin
        this.$[key] = applyFluentCapture(captured, (this as any).$)
        this._origin = null
      }
    }
  }

  _origin: any

  private copyMethods() {
    Object.assign(
      this.$,
      pick(this, [
        'atomic',
        'callback',
        'cleanup',
        'effect',
        'fulfill',
        'function',
        'globalLock',
        'lock',
        'mutate',
        'mutating',
        'query',
        'reduce',
        'register',
        'render',
        'tailQueue',
        'use',
        'using',
        'when',
        'with',
        'withLock',
        'withGlobalLock'
      ] as StringOf<keyof this>[])
    )
  }

  private runEffects(key: keyof T) {
    this.effects.get(key)!.forEach(this.run)
  }

  private clearKey(key: keyof T) {
    this.effects.get(key)!.forEach(f => {
      delete (f as any).values[key]
    })
  }

  // executeReducersFor(targetKey: keyof T) {
  //   for (const fx of this.effects.values()) {
  //     for (const f of fx) {
  //       if (f.target === targetKey) {
  //         this.run(f)
  //       }
  //     }
  //   }
  // }

  private maybeAddChangeListener = (key: StringKeys<T>, value: any) => {
    if (
      typeof value !== 'object' || !(value instanceof EventTarget)
      || (typeof Element !== 'undefined' && value instanceof Element)
    ) {
      return
    }

    const [prev, off] = this.fxListeners.get(key) ?? []
    if (prev === value) return

    //!? 'change listener', key
    off?.()

    const ownEvents = new WeakSet()

    const runKeyEffects = () => {
      // clearing values so they retrigger for same reference
      this.clearKey(key) // try to run effects first by using the setters
        ; (this.target as any)[key] = value
      // and then manually
      this.runEffects(key)
    }

    this.fxListeners.set(key, [
      value,
      onAll(value, event => {
        if (event.type === 'change') runKeyEffects()

        if (ownEvents.has(event)) return

        // TODO: better copy event function
        // @ts-ignore
        const newEvent = new (event.constructor)(event.type, {
          ...event,
          detail: (event as CustomEvent).detail,
          composed: true,
          bubbles: true,
        })

        ownEvents.add(newEvent)

        if (typeof Element === 'undefined' || !(this.target instanceof Element)) {
          console.error(this.target)
          throw new Error('Target is not an EventTarget')
        }
        ; (this.target as EventTarget).dispatchEvent(newEvent as any)
      }),
    ])

    return true
  }

  private createMemory() {
    const pending = (this as any).target._pendingProperties as Map<symbol, [string, any[]]>

    this.entries = entries(this.target)
    this.mem = fromEntries(this.entries.map(([key, value]) => {
      if (typeof value === 'symbol' && pending) {
        if (pending.has(value)) {
          this.scheduled.add({ key, value: pending.get(value)! })
          value = void 0 as any
        }
      }

      if (typeof value === 'function' && (value as any)[FluentCaptureSymbol] === true) {
        this.scheduled.add({ key, captured: (value as any)._results })
        value = void 0 as any
      }

      return [key, value]
    }))
  }

  origins = new Map()

  private createAccessors() {
    //!? 'creating accessors'
    accessors(this.$, this.target, key => ({
      get: () => this.mem[key],
      set: v => {
        //!? 'context setter:', key, v
        if (v === REDUCER) {
          v = this.reducer!.initial
          this.reducer!.target = key
          if (this.debug) {
            this.origins.set(key, new Error())
          }
          // if value is filled first time then return and don't use initial
          if (this.register(this.reducer!)) return
          if (v == null) return
        }
        this.target[key] = v
      },
      // NOTE: this filter depends on the next accessors call to
      // be followed immediately after this one.
    }), key => !this.keys.has(key))

    accessors(this.target, this.target, key => ({
      get: () => this.mem[key],
      set: v => {
        //!? 'context target setter:', key, v
        const prev = this.mem[key]
        const settings = (this.target as any)._getPropertySettings?.(key)
        const isDifferent = !(
          settings?.compare
            ? settings.compare(prev, v)
            : Object.is(prev, v)
        )
        //!? 'context target isDifferent', isDifferent, key, prev, v
        // if (key === 'presets') console.log('is different', isDifferent, key, v)
        if (isDifferent) {
          if (this.debug) {
            this.origins.set(key, new Error())
          }
          this.mem[key] = v
          //!? this.effects.get(key)
          this.runEffects(key)
          // this.maybeAddChangeListener(key, v)
        }
      },
    }), key => {
      if (!this.keys.has(key)) {
        this.keys.add(key)
        return true
      }
      return false
    })

    accessors(
      this.target,
      fromEntries(
        entries(this.mem).filter(
          ([key, value]) => {
            if (this.maybeAddChangeListener(key, value)) return true
          }
        )
      ),
      key => ({
        // get: () => this.mem[key],
        set: v => {
          //!? 'setting event target', key
          this.maybeAddChangeListener(key, v)
        },
      })
    )
  }

  // lastFlushTime = 0
  // cleanupDebounceTimeout: any
  cleanup = () => {
    // const diffTime = performance.now() - this.lastFlushTime
    // if (!force && diffTime < 10000) {
    //   console.warn('Debounced cleanup', this)
    //   clearTimeout(this.cleanupDebounceTimeout)
    //   this.cleanupDebounceTimeout = setTimeout(this.cleanup, diffTime + 10)
    //   return
    // }

    if (this.effects) {
      for (const fns of this.effects.values())
        fns.forEach(f => f.dispose?.())
    }
    this.effects = new Map([
      [NO_DEPS, []],
      ...this.entries.map(([key]) => [key, []]),
    ] as any)
  }

  register = (f: Fx<T>) => {
    if (this.debug) {
      f.origin.push(new Error())
    }

    f.keys = f.options?.keys ?? new Set(argtor(f.fn)) as Set<StringKeys<T>>

    f.fn = wrapQueue(f.options)(f.fn as any) as any

    f.keys.forEach(key => {
      const fx = this.effects.get(key)
      if (!fx) {
        console.warn('No effects for key:', key)
        return
      }
      fx.push(f)
    })

    !f.keys.size && this.effects.get(NO_DEPS)!.push(f)

    f.remove = async () => {
      if (f.keys!.size) {
        f.keys!.forEach(key => {
          const fx = this.effects.get(key)
          if (!fx) {
            console.warn('No effects for key:', key)
            return
          }
          removeFromArray(fx, f, true)
        })
      } else
        removeFromArray(this.effects.get(NO_DEPS)!, f)

      if (this.triggered.has(f))
        this.triggered.delete(f)

      f.dispose?.()
    }

    return this.run(f)
  }

  private update(f: Fx<T>) {
    let changed = f.pass == null

    f.pass ??= !f.keys!.size

    const changedKeys: string[] = []

    for (const key of f.keys!) {
      const value = this.target[key] as T[StringKeys<T>]
      if (value == null) {
        f.pass = false
        return true
      }

      const settings = (this.target as any)._getPropertySettings?.(key)

      const isDifferent = !(
        settings?.compare
          ? settings.compare(f.values[key], value)
          : Object.is(f.values[key], value)
      )

      if (isDifferent) {
        f.values[key] = value
        f.pass = true
        changed = true
        changedKeys.push(key)
      }
    }

    if (f.options?.why) console.warn(f, changedKeys)

    const origin = [
      ...f.origin,
      ...(f.originExtra ?? []),
      ...changedKeys.map(key => this.origins.get(key))
    ] as any

    this.emit('update', { f, changedKeys, origin })

    f.originExtra = null

    return changed
  }

  lastTasks = []
  hasScheduledFlush = false
  didFlushLast = false
  private flush = queue.task.first.last.next(() => {
    // this.lastFlushTime = performance.now()
    this.didFlushLast = true
    this.hasScheduledFlush = false

    if (this.triggered.size) {
      const tasks = [...this.triggered] as any
      this.triggered.clear()
      tasks.forEach(this.run)
      // this.lastTasks.forEach((task: any) => {
      //   if (this.triggered.has(task)) {
      //     console.warn('Task tried to recurse:', task)
      //     this.triggered.delete(task)
      //   }
      // })
      // this.lastTasks = tasks
    }
    // TODO: should the tailqueue run before the next triggered series?

    // if (this.triggered.size) {
    //   queueMicrotask(this.flush)
    // } else {
    if (this.tailQueue.size) {
      const tasks = [...this.tailQueue]
      this.tailQueue.clear()
      // queueMicrotask(() => {
      tasks.forEach(fn => fn())
      // })
      // if (this.triggered.size) {
      //   console.log('more!')
      // }
    }
    // }

    this.emit('flush')

    // requestAnimationFrame(() => {
    //   this.didFlushLast = false
    // })
    // if (this.triggered.size) {
    //   queueMicrotask(this.flush)
    // }

    // }
  })

  private run = (f: Fx<T>) => {
    if (this.debug) {
      f.originExtra ??= [new Error()]
    }

    if (f.pass && f.options?.once) return

    if (this.active.length || GlobalLock) {
      if (!this.active.includes(f)) this.triggered.add(f)
      GlobalLock?.add(this)
      return
    }

    this.active.push(f)

    f.dispose?.()

    if (this.update(f)) {
      if (!f.pass) {
        f.values = {} as Deps<T>
        return this.complete()
      }
    }

    return this.finalize()
  }

  get _fulfill() {
    const f = this.active.at(-1)
    const key = f?.target

    if (f == null || key == null) {
      throw new TypeError('Attempted to use `fulfill` when no reducer was active.')
    }

    return (value: any) => {
      this.target[key] = value
    }
  }

  private finalize() {
    const f = this.active.at(-1)!
    let result = (f.fn as CtxFn<T, Promise<unknown>>).call(this, f.values)

    if (f.options?.isFulfillReducer) {
      result = (result as any)(this._fulfill)
    }

    if (result?.then) {
      // f.dispose?.()
      result.then((result: any) => {
        f.dispose?.()
        try {
          if (f.cb?.(result) === false) {
            this.active.pop()
            this.flush()
            return
          }
          if (f.target != null && !f.options?.isFulfillReducer) {
            this.target[f.target] = result
          } else {
            if (Array.isArray(result)) result = chain(result)
            if (typeof result === 'function') {
              f.dispose = () => {
                ; (result as () => void)()
                f.dispose = null
              }
            }
          }
        } finally {
          if (f.options?.lock) {
            this.active.pop() // = null
            this.flush()
          }
        }

        // if (typeof res === 'function') {
        //   f.dispose = () => {
        //     res()
        //     f.dispose = null
        //   }
        // }
      })
      if (!f.options?.lock) {
        this.active.pop() // = null
        this.flush()
      }
      return true
    } else {
      return this.complete(result)
    }
  }

  private complete = (result?: unknown) => {
    const f = this.active.at(-1)!

    // TODO: the nullish ?. shouldn't be needed here.
    // for some reason this.active ends up null in some occassions.
    // Probably has to do with the globalLock() hack or event handlers.
    if (!f.pass) {
      this.active.pop() // = null
      this.flush()
      return
    }

    if (f.cb?.(result) === false) {
      this.active.pop() // = null
      this.flush()
      return
    }

    if (f.target != null && !f.options?.isFulfillReducer) {
      this.target[f.target] = result as T[keyof T]
      this.active.pop()
      this.flush()
      return true
    } else {
      if (Array.isArray(result)) result = chain(result)
      if (typeof result === 'function') {
        f.dispose = () => {
          ; (result as () => void)()
          f.dispose = null
        }
      }
      this.active.pop()
      this.flush()
    }
  }

  reduce = toFluent(EffectOptions<T>, options =>
    <R>(
      fn: FxFn<T, R | Promise<R>>,
      initial?: FxDef<T, R>['initial'],
    ): R => {
      this.reducer = new Fx({ fn, options, initial, origin: [this._origin] })
      this._origin = null
      return REDUCER as unknown as R
    })

  fulfill = toFluent(EffectOptions<T>, options =>
    <R>(
      fn: FxFn<T, (fulfill: (value: R) => void) => FxRet<void | unknown>>,
      initial?: FxDef<T, R>['initial'],
    ): R => {
      options.isFulfillReducer = true
      this.reducer = new Fx({ fn, options, initial, origin: [this._origin] } as any)
      this._origin = null
      return REDUCER as unknown as R
    })

  effect = toFluent(EffectOptions<T>, options => ((
    fn: FxFn<T, FxRet<void | unknown>>,
    cb?: FxDef<T>['cb'],
  ): OffEffect => {
    const f = new Fx({ fn, cb: cb ?? options.cb, options })
    this.register(f)
    return f.remove!
  }))

  mutate = <R>(
    fn: CtxFn<T, Promise<R> | void>,
  ) => {
    const f: Fx<T, R> = new Fx({ fn, options: { lock: true } as EffectOptions<any> })
    f.keys = new Set()
    f.values = { ...this.target } //as Deps<T>
    return this.run(f)
  }

  mutating = (fn: (ctx: T) => any) =>
    () => {
      this.mutate(fn)
    }

  use = <R>(fn: (ctx: T) => R) => fn(this.target)

  using = <R>(fn: (ctx: T) => R) => () => fn(this.target)

  function = <P extends unknown[], R>(fn: (ctx: T) => Fn<P, R>) => {
    const { withLock, target } = this
    let _args: any[] = []
    let _self: any = null
    let _result: R
    function inner() {
      const cb = fn(target) as any
      _result = cb.apply(_self, _args)
    }
    function wrapped(this: any, ...args: any[]) {
      // let result!: R
      _self = this
      _args = args
      withLock(inner)
      // () => {
      //   const cb = fn(target) as any
      //   result = cb.apply(this, args)
      // })
      return _result as R
    }
    return wrapped as unknown as Fn<P, R>
  }

  with = <P extends unknown[], R>(fn: (ctx: T) => Fn<P, R>) => {
    const { target } = this
    function wrapped(this: any, ...args: any[]) {
      const cb = fn(target) as any
      return cb.apply(this, args)
    }
    return wrapped as unknown as Fn<P, R>
  }

  callback = toFluent(EffectOptions<T>, options =>
    <P extends unknown[], R>(fn: (ctx: T) => Fn<P, R>) => {
      const { mutate } = this
      const qfn = wrapQueue(options)(
        function wrapped(this: ContextClass<T>, ...args: any[]) {
          mutate(ctx => {
            const cb = fn(ctx) as any
            cb.apply(this, args)
          })
        }
      )
      return qfn as unknown as Fn<P, void>
    })

  atomic = <P extends unknown[]>(fn: Fn<P, void>) => this.callback(() => fn) as Fn<P, void>

  query = <T extends HTMLElement>(sel: string): T => this.reduce(({ root }: any) => root.querySelector(sel)!)

  when = <T, P extends unknown[], R>(condition: unknown, cb: Fn<P, R>) =>
    function (this: T, ...args: P) {
      if (condition) cb.apply(this, args)
    }

  withGlobalLock = (fn: () => void) => {
    GlobalLock ??= new Set()
    try {
      fn()
    } catch (error) {
      console.warn(error)
    }
    const items = [...GlobalLock]
    GlobalLock = null
    for (const item of items) {
      item.flush()
    }
  }

  withLock = (fn: () => void) => {
    // if (this.active) {
    //   throw new Error('Already active')
    // }
    this.active.push(fn as any) // as any
    try {
      fn()
    } catch (error) {
      console.warn(error)
    }
    this.active.pop()
    this.flush()
  }

  lock = () => {
    // if (this.active) {
    //   throw new Error('Already active')
    // }

    this.active.push(Symbol() as any)
    return () => {
      this.active.pop() // = null
      this.flush()
    }
  }

  globalLock = () => {
    GlobalLock ??= new Set()
    return () => {
      if (!GlobalLock) return
      const items = [...GlobalLock]
      GlobalLock = null
      for (const item of items) {
        item.flush()
      }
    }
  }

  startDebugging = () => {
    const name = this.target.constructor.name
    this.on('update', ({ origin, changedKeys }) => {
      const atKey = origin.slice().reverse().map(x => x.stack).join('').match(/\[as (\w+)]/)?.[1]
      console.groupCollapsed(name + ': ' + changedKeys.join(' ') + (atKey?.length && !changedKeys.includes(atKey) ? ` > ${atKey}` : ''))
      for (const err of origin) {
        // const obj = {} as any
        // fetch(`/apply-sourcemaps?${encodeURIComponent(err.stack!)}`)
        //   .then((res) => res.text())
        //   .then((text) => { obj['>'] = text })
        // console.log(obj)
        console.log(err)
      }

      console.groupEnd()
    })
  }

}
