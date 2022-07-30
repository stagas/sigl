import type { VRef } from 'html-vdom'

import { dispatch, Off, on } from 'event-toolkit'
import { defineProperty, filterMap } from 'everyday-utils'
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

export interface Ref<T> extends Events<T, { change: CustomEvent }> {}

export class Ref<T> extends EventTarget {
  #current?: T | null
  key?: string

  declare current?: T

  constructor(ref?: Partial<Ref<T>>) {
    super()

    defineProperty
      .enumerable
      .get(() => this.#current)
      .set(el => {
        this.#current = el
        dispatch(this as Ref<T>, 'change')
      })(this, 'current')

    Object.assign(this, ref)
  }
}

export class PropsRef<T> {
  ref = new Ref<T>()
  constructor(props?: Partial<T>, key?: string) {
    Object.assign(this, props)
    // TODO: implement ref.key in html-vdom
    this.ref.key = key
  }
}

export interface RefCollection<T> extends Events<T, { change: CustomEvent }> {}

export type RefItem<T> = PropsRef<T> & $.CleanInstance<Partial<T>>

export abstract class RefCollection<T extends $.Element<T>> extends EventTarget {
  items: RefItem<T>[] = []
  listeners = new Map<PropsRef<T>, Off>()

  abstract construct(param: any): RefItem<T>

  #construct = (param: Partial<T> | [string, Partial<T>]): RefItem<T> => {
    const item = this.construct(param)
    this.listeners.set(
      item,
      on(item.ref).change(() => dispatch(this as RefCollection<T>, 'change'))
    )
    return item
  };

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]()
  }

  get length() {
    return this.items.length
  }

  get refs() {
    return filterMap(this.items, x => x.ref.current)
  }

  createItems(entries: [string, Partial<T>][]): void
  createItems(values: Partial<T>[]): void
  createItems(entriesOrValues: (Partial<T> | [string, Partial<T>])[] = []) {
    this.items = entriesOrValues.map(this.#construct)
  }

  find<R>(cb: (item: T, index: number, items: T[]) => R): T | undefined {
    return this.refs.find(cb)
  }

  map<R>(cb: (item: RefItem<T>, index: number, items: RefItem<T>[]) => R): R[] {
    return this.items.map(cb)
  }

  push(this: RefCollection<T>, state: Partial<T> | [string, Partial<T>]) {
    const result = this.items.push(this.#construct(state))
    dispatch(this, 'change')
    return result
  }

  insertAfter(this: RefCollection<T>, state: Partial<T> | [string, Partial<T>], other: T) {
    const index = this.refs.indexOf(other)
    if (!~index) {
      throw new ReferenceError('Item not in ref collection.')
    }
    const newItem = this.#construct(state)
    this.splice(index + 1, 0, newItem)
    return newItem
  }

  splice(this: RefCollection<T>, start: number, deleteCount?: number, ...args: any[]) {
    const result = this.items.splice(start, deleteCount!, ...args)
    dispatch(this, 'change')
    return result
  }

  move(this: RefCollection<T>, oldIndex: number, newIndex: number) {
    const item = this.items.splice(oldIndex, 1)[0]
    this.splice(newIndex, 0, item)
  }

  add(this: RefCollection<T>, ...items: RefItem<T>[]) {
    for (const item of items) {
      this.items.push(item)
    }
    dispatch(this, 'change')
  }

  getRefItem(this: RefCollection<T>, item: T) {
    const index = this.refs.indexOf(item as any)
    if (!~index) {
      throw new ReferenceError('Item not in ref collection.')
    }
    return this.items[index]
  }

  remove(this: RefCollection<T>, item: T): RefItem<T>
  remove(this: RefCollection<T>, item: RefItem<T>): RefItem<T>
  remove(this: RefCollection<T>, item: T | RefItem<T>) {
    const index = (item instanceof PropsRef ? this.items : this.refs).indexOf(item as any)
    if (!~index) {
      throw new ReferenceError('Item not in ref collection.')
    }
    return this.splice(index, 1)[0]
  }
}

export class RefMap<T extends $.Element<T>> extends RefCollection<T> {
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

  toJSON() {
    return filterMap(this.items, x => [x.ref.key!, (x.ref.current as any)?.toJSON()] as const)
  }

  get(key: string) {
    return this.#map.get(key)
  }
}

export class RefSet<T extends $.Element<T>> extends RefCollection<T> {
  construct(state: Partial<T>) {
    return new PropsRef(state) as RefItem<T>
  }

  constructor(values: Partial<T>[]) {
    super()
    this.createItems(values)
  }

  toJSON() {
    return filterMap(this.items, x => (x.ref.current as any)?.toJSON())
  }
}
