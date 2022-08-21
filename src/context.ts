import type { Fn, StringKeys, StringOf } from 'everyday-types'

import { argtor } from 'argtor'
import { Off, onAll, QueueOptions, wrapQueue } from 'event-toolkit'
import { accessors, entries, fromEntries, pick, removeFromArray } from 'everyday-utils'
import { bool, Fluent, toFluent } from 'to-fluent'

import { applyFluentCapture, FluentCapture, FluentCaptureSymbol } from 'proxy-toolkit'
import type { Attrs } from './attrs'

const NO_DEPS = Symbol()
const REDUCER = Symbol()

export class EffectOptions<T> extends QueueOptions {
  cb?: (value: any) => boolean | void
  keys?: Set<keyof T>
  once = bool
  lock = bool
  isFulfillReducer = bool
}

export type Deps<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

export type FxFn<T, R> = (deps: Deps<Attrs<T>>) => R
export type CtxFn<T, R> = (ctx: T) => R
export type FxRet<R> = Promise<R> | (() => Promise<R>) | R | void

export type FluentFx<T, R, U, D = void> = Fluent<(fn: FxFn<T, R>, def: D) => U, Required<EffectOptions<T>>>

export type OffEffect = () => Promise<void>

export interface FxDef<T, R = void | unknown> {
  fn: FxFn<T, FxRet<R>> | CtxFn<T, FxRet<R>>
  cb?: (value: any) => boolean | void
  keys?: Set<keyof T>
  dispose?: (() => void) | null
  options?: EffectOptions<T>
  initial?: R
}

export interface Fx<T, R = void | unknown> extends FxDef<T, R> {}

export class Fx<T, R = void | unknown> {
  remove?: () => Promise<void>
  target?: keyof T
  values = {} as T
  pass?: boolean

  constructor(fx: FxDef<T, R>) {
    Object.assign(this, fx)
  }
}

export type Context<T extends object> = T & ContextClass<T>

let GlobalLock: any

export class ContextClass<T extends object> {
  private entries!: readonly [StringOf<keyof T>, T[keyof T]][]
  private mem!: Record<StringOf<keyof T>, T[keyof T]>
  private keys = new Set<StringOf<keyof T>>()

  private effects!: Map<keyof T | symbol, Fx<T>[]>
  private triggered = new Set<Fx<T>>()

  active?: Fx<T> | null
  private reducer?: Fx<T>

  public $ = {} as Context<T>

  private scheduled = new Set<{ key: keyof T; value?: [string, any[]]; captured?: FluentCapture }>()
  private listeners = new Map<keyof T, [any, Off]>()

  static attach<T extends object & { $?: Context<T>; context?: ContextClass<T> }>(target: T, extension: any = {}) {
    if (target.context instanceof ContextClass) {
      // TODO: what should be the behavior here?
      return
    }
    //!? 'attach context to target', target
    target.context = new ContextClass(target)

    // We are using mutate() to extend $ because at this point there are reactive effects
    // that will trigger and depend on the $ object to be fulfilled, along with its extension.
    // We pass the extension from the caller because we want to be environment agnostic and
    // in the DOM context, the extension contains DOM initializers that don't exist in Workers
    // and we want the context to be able to work in both environments.
    target.context.mutate(() => {
      target.$ = Object.assign(target.context!.$ as any, extension)
    })
  }

  constructor(private target: T) {
    this.copyMethods()
    this.createMemory()
    this.createAccessors()
    this.cleanup()
    for (const item of this.scheduled) {
      if (item.value) {
        const { key, value: [method, args] } = item
        this.$[key] = (this as any).$[method](...args)
      } else if (item.captured) {
        const { key, captured } = item
        this.$[key] = applyFluentCapture(captured, (this as any).$)
      }
    }
  }

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
        'mutate',
        'mutating',
        'reduce',
        'register',
        'render',
        'use',
        'using',
        'query',
        'when',
        'with',
        'withLock',
        'globalLock',
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

    const [prev, off] = this.listeners.get(key) ?? []
    if (prev === value) return

    //!? 'change listener', key
    off?.()

    const ownEvents = new WeakSet()

    const runKeyEffects = () => {
      // clearing values so they retrigger for same reference
      this.clearKey(key) // try to run effects first by using the setters
      ;(this.target as any)[key] = value
      // and then manually
      this.runEffects(key)
    }

    this.listeners.set(key, [
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
        ;(this.target as EventTarget).dispatchEvent(newEvent as any)
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

  private createAccessors() {
    //!? 'creating accessors'
    accessors(this.$, this.target, key => ({
      get: () => this.mem[key],
      set: v => {
        //!? 'context setter:', key, v
        if (v === REDUCER) {
          v = this.reducer!.initial
          this.reducer!.target = key
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
        const isDifferent = !(Object.is(prev, v))
        //!? 'context target isDifferent', isDifferent, key, prev, v
        // if (key === 'presets') console.log('is different', isDifferent, key, v)
        if (isDifferent) {
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

  cleanup = () => {
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
    f.keys = f.options?.keys ?? argtor(f.fn) as Set<keyof T>

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

    for (const key of f.keys!) {
      const value = this.target[key]
      if (value == null) {
        f.pass = false
        return true
      }
      if (!(Object.is(f.values[key], value))) {
        f.values[key] = value
        f.pass = true
        changed = true
      }
    }

    return changed
  }

  private flush = () => {
    const current = [...this.triggered] as any
    this.triggered.clear()
    current.forEach(this.run)
  }

  private run = (f: Fx<T>) => {
    if (f.pass && f.options?.once) return

    if (this.active || GlobalLock) {
      if (f !== this.active) this.triggered.add(f)
      GlobalLock?.add(this)
      return
    }

    this.active = f

    if (this.update(f)) {
      f.dispose?.()
      if (!f.pass) {
        f.values = {} as Deps<T>
        return this.complete()
      }
    }

    return this.finalize()
  }

  get _fulfill() {
    const f = this.active
    const key = f?.target

    if (f == null || key == null) {
      throw new TypeError('Attempted to use `fulfill` when no reducer was active.')
    }

    return (value: any) => {
      this.target[key] = value
    }
  }

  private finalize() {
    const f = this.active!
    let result = (f.fn as CtxFn<T, Promise<unknown>>).call(this, f.values)

    if (f.options?.isFulfillReducer) {
      result = (result as any)(this._fulfill)
    }

    if (result?.then) {
      result.then((res: any) => {
        try {
          if (f.cb?.(res) === false) return
          if (f.target != null && !f.options?.isFulfillReducer) {
            this.target[f.target] = res
          }
        } finally {
          if (f.options?.lock) {
            this.active = null
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
        this.active = null
        this.flush()
      }
      return true
    } else {
      return this.complete(result)
    }
  }

  private complete = (result?: unknown) => {
    const f = this.active!

    if (!f.pass) {
      this.active = null
      this.flush()
      return
    }

    if (f.cb?.(result) === false) {
      this.active = null
      this.flush()
      return
    }

    if (f.target != null && !f.options?.isFulfillReducer) {
      this.target[f.target] = result as T[keyof T]
      this.active = null
      this.flush()
      return true
    } else {
      if (typeof result === 'function') {
        f.dispose = () => {
          result()
          f.dispose = null
        }
      }
      this.active = null
      this.flush()
    }
  }

  reduce = toFluent(EffectOptions<T>, options =>
    <R>(
      fn: FxFn<T, R | Promise<R>>,
      initial?: FxDef<T, R>['initial'],
    ): R => {
      this.reducer = new Fx({ fn, options, initial })
      return REDUCER as unknown as R
    })

  fulfill = toFluent(EffectOptions<T>, options =>
    <R>(
      fn: FxFn<T, (fulfill: (value: R) => void) => FxRet<void | unknown>>,
      initial?: FxDef<T, R>['initial'],
    ): R => {
      options.isFulfillReducer = true
      this.reducer = new Fx({ fn, options, initial } as any)
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
    function wrapped(this: any, ...args: any[]) {
      let result!: R
      withLock(() => {
        const cb = fn(target) as any
        result = cb.apply(this, args)
      })
      return result
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
    function(this: T, ...args: P) {
      if (condition) cb.apply(this, args)
    }

  withGlobalLock = (fn: () => void) => {
    GlobalLock = new Set()
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
    this.active = fn as any
    try {
      fn()
    } catch (error) {
      console.warn(error)
    }
    this.active = null
    this.flush()
  }
}
