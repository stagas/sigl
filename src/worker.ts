// @ts-ignore
globalThis.Reflect.metadata ??= () => {}

import * as event from 'event-toolkit'
import { EventKeys } from 'everyday-types'
import * as context from './context'

import type * as sigl from './sigl'

const $ = Object.assign({}, event, context)

export default $

// this needs to be synced manually from goto://index.ts#$
namespace $ {
  export type AbortOptions = sigl.AbortOptions
  export type ChildOf<T> = sigl.ChildOf<T>
  export type Class<T> = sigl.Class<T>
  export type CleanClass<T> = sigl.CleanClass<T>
  export type CleanInstance<T> = sigl.CleanInstance<T>
  export type Component<T = HTMLElement, I = HTMLElement> = sigl.Component<T, I>
  export type Context<T extends object> = sigl.Context<T>
  export type ContextClass<T extends object> = sigl.ContextClass<T>
  export type CustomElementConstructor = sigl.CustomElementConstructor
  export type Deps<T> = sigl.Deps<T>
  export type Dispatch<T> = sigl.Dispatch<T>
  export type DispatchOptions = sigl.DispatchOptions
  export type Element<T, E = object> = sigl.Element<T, E>
  export type ElementClass = sigl.ElementClass
  export type EventHandler<T, E> = sigl.EventHandler<T, E>
  export type EventOptions = sigl.EventOptions
  export type Events<T, P extends Record<string, Event>> = sigl.Events<T, P>
  export type FxFn<T, R> = sigl.FxFn<T, R>
  export type HTMLAttributes<T> = sigl.HTMLAttributes<T>
  export type Intersect = sigl.Intersect
  export type JsxContext<T> = sigl.JsxContext<T>
  export type LifecycleEvents = sigl.LifecycleEvents
  export type Line = sigl.Line
  export type Matrix = sigl.Matrix
  export type Mixin = sigl.Mixin
  export type Morph = sigl.Morph
  export type Narrow<T, U> = sigl.Narrow<T, U>
  export type NestedCSSCompiler = sigl.NestedCSSCompiler
  export type NestedCSSDeclaration = sigl.NestedCSSDeclaration
  export type Off = sigl.Off
  export type On<T> = sigl.On<T>
  export type OnEvent<T, K extends EventKeys<T>> = sigl.OnEvent<T, K>
  export type OnGetter<T> = sigl.OnGetter<T>
  export type Point = sigl.Point
  export type Polygon = sigl.Polygon
  export type Polyline = sigl.Polyline
  export type PropertyKind<T> = sigl.PropertyKind<T>
  export type QueueOptions = sigl.QueueOptions
  export type Rect = sigl.Rect
  export type Ref<T> = sigl.VRef<T>
  export type Scalar = sigl.Scalar
  export type Shape = sigl.Shape
  export type ShapeLike = sigl.ShapeLike
  export type StateInstance = sigl.StateInstance
  export type Super<T = any, U = object> = sigl.Super<T, U>
  export type Task = sigl.Task
}
