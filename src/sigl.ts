import { Class, CustomElementConstructor, Narrow, StringKeys } from 'everyday-types'
import { render } from 'html-vdom'
import { fromElement } from 'html-vdom/from-element'
import { FluentCapture, Getter } from 'proxy-toolkit'
import { Fluent } from 'to-fluent'

import { Context, ContextClass, Deps, FxFn } from './context'
import { element, ElementClass, JsxContext, LifecycleEvents } from './element'
import { Events } from './events'
import * as ext from './extensions'
import { State, StateEventKeys } from './state'

import $ from '.'

export * from 'event-toolkit'
export * from 'html-vdom/from-element'
export * from 'nested-css'
export { pipeInto as mix } from 'ts-functional-pipe'

export * from 'geometrik'
export { isMobileAgent as isMobile } from 'is-mobile-agent'
export * from './decorators'
export * as mixins from './mixins'
export * from './refs'
export * from './slots'
export * from './util'

export type Mixin<T extends CustomElementConstructor = CustomElementConstructor> = T

export type { HTMLAttributes, VRef } from 'html-vdom'

export type Element<T, U = object> =
  & HTMLElement
  & Events<T, LifecycleEvents & U>
  & {
    host: T
    $: Context<T & JsxContext<T> & Omit<typeof $, 'transition'>>
    context: ContextClass<T & JsxContext<T> & Omit<typeof $, 'transition'>>
    mounted?(ctx: $.Element<T, U>['$']): void
    created?(ctx: $.Element<T, U>['$']): void
    toJSON(): Pick<T, StringKeys<T>>
  }

export type ChildOf<T> = Omit<T, keyof Omit<Element<any>, keyof HTMLElement>>

export { ContextClass, element, fromElement, render, State }

export type {
  Class,
  Context,
  CustomElementConstructor,
  Deps,
  ElementClass,
  Events,
  FxFn,
  JsxContext,
  LifecycleEvents,
  Narrow,
}

export type StateInstance = State<any, any>

export type CleanInstance<T> = Omit<
  T,
  keyof Omit<Element<any>, 'id'>
>

export type CleanClass<T> = Class<CleanInstance<T>>

export type Super<T = any, U = object> = Class<Element<T, U>>

export type Extensions<T extends Element<any>> = {
  shadow: (init?: ShadowRootInit | string, html?: string) => ShadowRoot
  slotted: Fluent<<U>(mapFn?: (el: U) => U | false | null | undefined) => U[] | U, Required<ext.SlottedSettings>>
  state: <U extends { Idle: Narrow<U['Idle'], string> }>(stateEnum: U) =>
    & State<T, U>
    & Events<
      T,
      {
        [K in StateEventKeys<Narrow<U[StringKeys<U>], string>>]: CustomEvent
      }
    >
}

export type Wrapper<T extends Element<any>> = Extensions<T> & Omit<T['$'], keyof Extensions<any>>

export function _<T>(ctor: Class<T>): CleanClass<T>
export function _<T extends Element<any>>(ctx: T | Class<T>): Wrapper<T>
export function _<T extends Element<any>>(ctx: T | Class<T>) {
  if (typeof ctx === 'function') {
    return ctx as CleanClass<T>
  } else {
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
          return (states: any) => new State(states)
        default: {
          return FluentCapture()[key]
        }
      }
    }) as Wrapper<T>
  }
}

export const mixin = <T>(
  mixin: (superclass: CleanClass<object>) => Class<T>,
) =>
  <V extends object>(realsuperclass: CleanClass<V>) =>
    element()(mixin(realsuperclass) as any) as unknown as CleanClass<T & V>
