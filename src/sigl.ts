import { Class, CustomElementConstructor, Narrow, StringKeys, StringOf } from 'everyday-types'
export type { Class, CustomElementConstructor, Narrow, StringKeys, StringOf, EventKeys, EventHandler, Target, ValuesOf } from 'everyday-types'

export { render, render as renderDom, renderCache } from 'html-vdom'

import { FluentCapture, Getter } from 'proxy-toolkit'
import { Fluent } from 'to-fluent'

import { Context, ContextClass, Deps, FxDeps, FxFn } from './context'
export { GlobalLock } from './context'

import { Events } from './events'
import * as ext from './extensions'

import { State, StateEventKeys } from './state'
export { State }
export type { States } from './state'

import $ from '.'

export * from 'event-toolkit'
export * from 'nested-css'
export { pipeInto as mix } from 'ts-functional-pipe'

export * from 'geometrik'
export * from './decorators'
export * from './dom-util'
export * as mixins from './mixins'
export * from './refs'
export * from './slots'
export * from './util'

export type Mixin<T extends CustomElementConstructor = CustomElementConstructor> = T

export interface Positioned extends $.Element<Positioned> {
  pos: $.Point
  size: $.Point
  rect: $.Rect
}

export type { HTMLAttributes, VRef } from 'html-vdom'

export * from './element'
export * from './reactive'

import { AnimSettings } from 'animatrix'
import { Element } from './element'

export type Reactive<T = any> = {
  self: T
  $: Context<T & typeof $>
  context: ContextClass<T & typeof $>
  created?(ctx: Reactive<T>['$']): void
  destroy(): void
  toJSON(): Pick<T, StringKeys<T>>
}

// export { ContextClass, element, render, State }

export type {
  Context,
  Deps,
  // ElementClass,
  Events,
  FxDeps,
  FxFn,
  // JsxContext,
  // LifecycleEvents,
}

export type StateInstance = State<any, any>

export type CleanInstance<T> = Omit<
  T,
  keyof Omit<Element, 'id'> | keyof Reactive
>

export type CleanClass<T> = Class<CleanInstance<T>>

export type Super<T extends HTMLElement = any, U = object> = Class<Element<T, U>>

export type DomExtensions<T extends Element<any> = any> = {
  shadow: (init?: ShadowRootInit | string, html?: string) => ShadowRoot
  slotted: Fluent<<U>(mapFn?: (el: U) => U | false | null | undefined) => U[] | U, Required<ext.SlottedSettings>>
  state: <U extends { Idle: Narrow<U['Idle'], string> }>(
    stateEnum: U,
    guard?: any,
    AnimSettings?: Partial<{ [K in StringOf<U>]: AnimSettings }>,
  ) =>
    & State<T, U>
    & Events<
      T,
      {
        [K in StateEventKeys<Narrow<U[StringKeys<U>], string>>]: CustomEvent
      }
    >
}

export type ElementWrapper<T extends Element> = DomExtensions<T> & Omit<T['$'], keyof DomExtensions>

export type ReactiveWrapper<T extends Reactive> = T['$']

export function inherit<T>(ctor: Class<T>): CleanClass<T> {
  return ctor as CleanClass<T>
}

export function _<T extends Class<T>>(ctor: T): CleanClass<T>
export function _<T extends Element>(ctx: T): ElementWrapper<T>
export function _<T extends Reactive>(ctx: T): ReactiveWrapper<T>
export function _<T extends Element, U extends Reactive, V extends Class<any>>(ctx: T | U | Class<V>) {
  if (typeof ctx === 'function') {
    return ctx as CleanClass<V>
  } else if (ctx instanceof HTMLElement) {
    const c = ctx as unknown as { _scheduleProperty(key: string, ...args: any[]): symbol }
    const shadow = $.shadow.bind(null, ctx)
    const slotted = ext.slotted(c)
    return Getter(key => {
      switch (key) {
        case 'shadow':
          return shadow
        case 'slotted':
          return slotted
        case 'state':
          return (states: any, guard: any, AnimSettings: any) => new State(states, guard, AnimSettings)
        default: {
          return FluentCapture()[key]
        }
      }
    }) as ElementWrapper<T>
  } else {
    return Getter(key => {
      switch (key) {
        // case 'state':
        //   return (states: any) => new State(states)
        default: {
          return FluentCapture()[key]
        }
      }
    }) as ReactiveWrapper<U>
  }
}

export const mixin = <T>(mixin: (superclass: CleanClass<object>) => Class<T>) => {
  return <V extends object>(realsuperclass: CleanClass<V>) =>
    $.element()(mixin(realsuperclass) as any) as unknown as CleanClass<T & V>
}
