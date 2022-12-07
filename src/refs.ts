import type { VRef } from 'html-vdom'

import { chain, dispatch, Off, on } from 'event-toolkit'
import { defineProperty, filterMap, MapSet } from 'everyday-utils'
import { Getter } from 'proxy-toolkit'

import { Events } from './events'

import $ from './'

export type Refs<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Element ? VRef<T[K]>
  : never
}

export const RefProxy = <T>(target: any) =>
  Getter(key => ({
    get current() {
      return target[key]
    },
    set current(el) {
      target[key] = el
    },
  })) as Refs<T>

export interface Ref<T> extends Events<T, { change: CustomEvent<T> }> { }

export class Ref<T> extends EventTarget {
  #current?: T | null
  key?: string

  declare current?: T

  constructor(ref?: Partial<Ref<T>>) {
    super()

    // let off: Off

    defineProperty
      .enumerable
      .get(() => this.#current)
      .set(el => {
        this.#current = el
        // off?.()
        // off = on(el as HTMLInputElement, 'change')(() => dispatch(this as Ref<T>, 'change'))
        dispatch(this as Ref<T>, 'change', el)
      })(this, 'current')

    Object.assign(this, ref)
  }
}

export class PropsRef<T> {
  ref = new Ref<T>()
  declare _props: T
  constructor(props?: Partial<T>, key?: string) {
    Object.assign(this, (props as any)?.toJSON?.() ?? props)
    if (props instanceof EventTarget) {
      // queueMicrotask(() => {
      this.ref.current = props as any
      // })
    }
    defineProperty.not.enumerable(this, '_props', props)
    // TODO: implement ref.key in html-vdom
    if (key) this.ref.key = key
  }
}

export interface RefCollection<T> extends Events<T, { change: CustomEvent }> { }

export type RefItem<T> = PropsRef<T> & $.CleanInstance<Partial<T>>

export abstract class RefCollection<T> extends EventTarget {
  items: RefItem<T>[] = []
  listeners = new Map<PropsRef<T>, Off>()

  abstract construct(param: any): RefItem<T>

  #construct = (param: Partial<T> | [string, Partial<T>]): RefItem<T> => {
    const item = this.construct(param)
    this.listeners.set(
      item,
      on(item.ref).change(() => {
        dispatch(this as RefCollection<T>, 'change')
      })
    )
    return item
  }

  refConstruct(param: Partial<T> | [string, Partial<T>]): RefItem<T> {
    return this.#construct(param)
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]()
  }

  get length() {
    return this.items.length
  }

  get refs() {
    return filterMap(this.items, x => x.ref.current)
  }

  refEvents = new MapSet<string, (this: this, ev: any, originThis: any) => any>()

  onEvent(eventName: string, fn: (this: this, ev: any, originThis: any) => any) {
    const refThis = this

    this.refEvents.add(eventName, fn)

    let offRefListeners: any

    const resetRefListeners = () => {
      offRefListeners?.()
      offRefListeners = chain(
        this.refs.map((x) =>
          on(x as unknown as EventTarget, eventName as never)(
            function (ev) {
              return fn.call(refThis, ev, this)
            }))
      )
    }

    const offChange = on(this as any, 'change' as never)(resetRefListeners)

    resetRefListeners()

    const off = chain(
      offChange,
      () => {
        this.refEvents.delete(eventName, fn)
      },
      () => {
        offRefListeners?.()
      }
    )

    return off
  }

  createItems(entries: [string, Partial<T>][]): void
  createItems(values: Partial<T>[]): void
  createItems(entriesOrValues: (Partial<T> | [string, Partial<T>])[] = []) {
    this.items = entriesOrValues.map(this.#construct)
  }

  find<R>(cb: (item: T, index: number, items: T[]) => R): T | undefined {
    return this.refs.find(cb)
  }

  findIndex<R>(cb: (item: T, index: number, items: T[]) => R): number {
    return this.items.map((item) => item.ref.current!).findIndex(cb)
  }

  map<R>(cb: (item: RefItem<T>, index: number, items: RefItem<T>[]) => R): R[] {
    return this.items.map(cb)
  }

  filter(cb: (item: RefItem<T>, index: number, items: RefItem<T>[]) => any): RefItem<T>[] {
    return this.items.filter(cb)
  }

  push(state: Partial<T> | [string, Partial<T>]) {
    const result = this.items.push(this.#construct(state))
    dispatch(this, 'change' as any)
    return result
  }

  insertAfter(state: Partial<T> | [string, Partial<T>], other: T) {
    const index = this.refs.indexOf(other)
    if (!~index) {
      throw new ReferenceError('Item not in ref collection.')
    }
    const newItem = this.#construct(state)
    this.splice(index + 1, 0, newItem)
    return newItem
  }

  splice(start: number, deleteCount?: number, ...args: any[]) {
    const result = this.items.splice(start, deleteCount!, ...args)
    dispatch(this, 'change' as any)
    return result
  }

  move(oldIndex: number, newIndex: number) {
    const item = this.items.splice(oldIndex, 1)[0]
    this.splice(newIndex, 0, item)
  }

  add(...items: RefItem<T>[]) {
    for (const item of items) {
      this.items.push(item)
    }
    dispatch(this, 'change' as any)
  }

  insertItemAt(index: number, ...items: RefItem<T>[]) {
    this.items.splice(index, 0, ...items)
    dispatch(this, 'change' as any)
  }

  getRefItem(item: T) {
    const index = this.map((refItem) => refItem.ref.current!).indexOf(item as any)
    if (!~index) {
      throw new ReferenceError('Item not in ref collection.')
    }
    return this.items[index]
  }

  remove(item: T): RefItem<T>
  remove(item: RefItem<T>): RefItem<T>
  remove(item: T | RefItem<T>) {
    let index: number

    if (item instanceof HTMLElement) {
      index = this.items.indexOf(this.getRefItem(item as T))
    } else {
      index = this.items.indexOf(item as RefItem<T>)
    }

    if (!~index) {
      throw new ReferenceError('Item not in ref collection.')
    }

    return this.splice(index, 1)[0]
  }
}

export class RefMap<T> extends RefCollection<T> {
  #map = new Map<string, RefItem<T>>()

  construct([key, state]: [string, Partial<T>]) {
    const item = new PropsRef(state, key) as RefItem<T>
    this.#map.set(item.ref.key!, item)
    return item
  }

  constructor(entries: [string, Partial<T>][]) {
    super()
    this.createItems(entries)
  }

  toJSON(): unknown {
    return filterMap(this.items, x => [
      x.ref.key!,
      ((x.ref.current as any)?.toJSON && x.ref.current)
      ?? x._props
    ] as const)
  }

  get(key: string, defaultProps: Partial<T> = {}) {
    if (this.#map.has(key)) return this.#map.get(key)!
    else {
      const item = this.refConstruct([key, defaultProps])
      this.items.push(item)
      return item
    }
  }

  getRef(key: string, defaultProps: Partial<T> = {}) {
    return this.get(key, defaultProps).ref
  }

  setRef(key: string, el: T) {
    this.get(key).ref.current = el
  }

  delete(key: string) {
    if (this.#map.has(key)) {
      const item = this.#map.get(key)!
      this.#map.delete(key)
      this.remove(item)
    }
  }
}

export class RefSet<T> extends RefCollection<T> {
  construct(state: Partial<T>) {
    return new PropsRef(state) as RefItem<T>
  }

  constructor(values: Partial<T>[]) {
    super()
    this.createItems(values)
  }

  get(id: string) {
    return this.refs.find(ref => (ref as any).id === id)
  }

  has(id: string) {
    return !!this.get(id)
  }

  at(index: number, defaultProps: Partial<T> = {}) {
    if (this.items[index]) return this.items[index]
    else {
      const item = this.refConstruct(defaultProps)
      this.splice(index, 0, item)
      return item
    }
  }

  push(ref: T): number
  push(state: Partial<T>): number
  push(state: Partial<T> | T) {
    if (state instanceof HTMLElement) {
      const item = this.refConstruct({})
      item.ref.current = state as T
      // we save the length before because the .add() will
      // trigger side-effects which could change the length
      // and we're going to have a wrong index
      const length = this.items.length
      super.add(item)
      return length + 1
    }
    return super.push(state)
  }


  insertAt(index: number, ref: T): void
  insertAt(index: number, state: Partial<T>): void
  insertAt(index: number, state: Partial<T> | T) {
    if (state instanceof HTMLElement) {
      const item = this.refConstruct({})
      item.ref.current = state as T
      super.insertItemAt(index, item)
    }
    const item = this.refConstruct(state)
    return super.insertItemAt(index, item)
  }

  toJSON(): unknown {
    return filterMap(this.items, (x) =>
      ((x.ref.current as any)?.toJSON && x.ref.current)
      ?? x._props
    )
  }
}
