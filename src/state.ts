import { DetailOf, Narrow } from 'everyday-types'

import $ from '.'

export type StateEventKeys<T extends string> = `${T}start` | `${T}end` | `${T}cancel` | `${T}pause` | `${T}resume`

export type States = { Idle: any }

export class State<T extends EventTarget, U extends States, L = U[keyof U]> extends EventTarget {
  static from<T extends EventTarget, U extends States>(x: U): State<T, U>
  static from<T extends EventTarget, U extends States>(x: U[]): State<T, U>
  static from<T extends EventTarget, U extends States>(x: unknown): State<T, U> {
    return new State(
      Array.isArray(x) ? x : (x as string).toString().split(',') as any
    )
  }

  stack!: U[keyof U][]

  constructor(public states: U) {
    super()
    this.stack = [states.Idle]

    // @ts-ignore
    $.on(this).change(() => {
      $.dispatch(this, 'statechange' as any, this)
    })

    if (this.stack.length) {
      $.dispatch(this, 'change' as any)
    }
  }

  toJSON() {
    return this.states
  }

  get current() {
    return this.toString() as unknown as L
  }

  get isIdle() {
    return this.stack.length === 1
  }

  toString() {
    return this.stack.at(-1)!
  }

  is(testState: U[keyof U]) {
    return this.stack.at(-1) === testState
  }

  emit<V extends Narrow<U[keyof U], string>, K = DetailOf<T, `on${V}`>>(
    state: V,
    ...detail: K extends object ? [K] : [undefined?]
  ): void {
    if (!this.is(state)) {
      throw new TypeError(
        `Attempt to emit for "${state}" but our current state stack is "${this.stack}"`
      )
    }
    $.dispatch(this, state as any, ...detail)
  }

  push<V extends Narrow<U[keyof U], string>, K = DetailOf<T, `on${V}start`>>(
    state: V,
    ...detail: K extends object ? [K] : [undefined?]
  ): void {
    if (this.is(state)) {
      throw new TypeError(
        `Attempt to push state "${state}" again on top of itself, our current state stack is "${this.stack}"`
      )
    }
    this.stack = [...this.stack, state]
    //!warn 'push %s', this.stack
    $.dispatch(this, `${this.stack.at(-2)!}pause` as any)
    $.dispatch(this, `${state}start` as any, ...detail)
    $.dispatch(this, 'change' as any)
  }

  pop<V extends Narrow<U[keyof U], string>, K = DetailOf<T, `on${V}end`>>(
    state: V,
    ...detail: K extends object ? [K] : [undefined?]
  ): void {
    if (!this.is(state)) {
      throw new TypeError(
        `Attempt to pop state "${state}" but our current state stack is "${this.stack}"`
      )
    }
    if (this.stack.length === 1) {
      throw new TypeError(
        `Attempt to pop base state "${state}" when stack is length 1.`
      )
    }
    this.stack = [...this.stack.slice(0, -1)]
    //!warn 'pop %s (-%s)', this.stack, state
    $.dispatch(this, `${state}end` as any, ...detail)
    $.dispatch(this, `${this.stack.at(-1)!}resume` as any)
    $.dispatch(this, 'change' as any)
  }

  cancel<V extends Narrow<U[keyof U], string>, K = DetailOf<T, `on${V}cancel`>>(
    state: V,
    ...detail: K extends object ? [K] : [undefined?]
  ): void {
    if (!this.is(state)) {
      throw new TypeError(
        `Attempt to cancel state "${state}" but our current state stack is "${this.stack}"`
      )
    }
    if (this.stack.length === 1) {
      throw new TypeError(
        `Attempt to cancel base state "${state}" when stack is length 1.`
      )
    }
    this.stack = [...this.stack.slice(0, -1)]
    //!warn 'cancel %s (-%s)', this.stack, state
    $.dispatch(this, `${state}cancel` as any, ...detail)
    $.dispatch(this, `${this.stack.at(-1)!}resume` as any)
    $.dispatch(this, 'change' as any)
  }

  swap<V extends Narrow<U[keyof U], string>, K = DetailOf<T, `on${V}start`>>(
    state: V,
    ...detail: K extends object ? [K] : [undefined?]
  ): void {
    if (this.stack.length === 1) {
      throw new TypeError(
        `Attempt to swap base state "${state}" when stack is length 1.`
      )
    }
    const prev = this.current
    this.stack = [...this.stack.slice(0, -1), state]
    //!warn 'swap %s (!%s)', this.stack, prev
    $.dispatch(this, `${prev}cancel` as any)
    $.dispatch(this, `${this.stack.at(-1)!}start` as any, ...detail)
    $.dispatch(this, 'change' as any)
  }

  returnToIdle() {
    while (!this.isIdle) {
      this.cancel(this.current as any, void 0)
    }
  }
}
