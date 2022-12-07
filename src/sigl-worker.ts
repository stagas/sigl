import { Class, StringKeys } from 'everyday-types'
export type { Class, Narrow, StringKeys, EventKeys, EventHandler, ValuesOf } from 'everyday-types'

import { FluentCapture, Getter } from 'proxy-toolkit'

import { Context, ContextClass, Deps, FxDeps, FxFn } from './context'
import { Events } from './events'

import $ from './worker'

export * from 'event-toolkit'
export * from 'nested-css'
export { pipeInto as mix } from 'ts-functional-pipe'

export * from 'geometrik'
export * from './decorators'
export * from './util'

import { reactive, ReactiveClass } from './reactive'
export { reactive }
export type { ReactiveClass }

export type Mixin<T extends Class<T> = Class<any>> = Class<T>

export type Reactive<T> = {
  self: T
  $: Context<T & Omit<typeof $, 'transition'>>
  context: ContextClass<T & Omit<typeof $, 'transition'>>
  created?(ctx: Reactive<T>['$']): void
  destroy(): void
  toJSON(): Pick<T, StringKeys<T>>
}

export type ChildOf<T> = Omit<T, keyof Reactive<any>>

export { ContextClass }

export type { Context, Deps, Events, FxDeps, FxFn }

export type CleanInstance<T> = Omit<
  T,
  keyof Omit<Reactive<any>, 'id'>
>

export type ReactiveWrapper<T extends Reactive<any>> = T['$']

export type CleanClass<T> = Class<CleanInstance<T>>

export type Super<T = any> = Class<Reactive<T>>

export function _<T>(ctor: Class<T>): CleanClass<T>
export function _<T extends Reactive<any>>(ctx: T | Class<T>): ReactiveWrapper<T>
export function _<T extends Reactive<any>>(ctx: T | Class<T>) {
  if (typeof ctx === 'function') {
    return ctx as CleanClass<T>
  } else {
    // const c = ctx as unknown as { _scheduleProperty(key: string, ...args: any[]): symbol }
    return Getter(key => {
      switch (key) {
        // case 'state':
        //   return (states: any) => new State(states)
        default: {
          return FluentCapture()[key]
        }
      }
    }) as ReactiveWrapper<T>
  }
}

export const mixin = <T>(
  mixin: (superclass: CleanClass<object>) => Class<T>,
) =>
  <V extends object>(realsuperclass: CleanClass<V>) =>
    reactive()(mixin(realsuperclass) as any) as unknown as CleanClass<T & V>
