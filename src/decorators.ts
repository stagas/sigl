import { QueueOptions } from 'event-toolkit'
import { toFluent } from 'to-fluent'

export class PropertySettings extends QueueOptions {
  attr = false
  clone = false
  compare?: ((oldValue: any, newValue: any) => boolean) | null
  is?: PropertyKind | undefined
  out = false
}

export type PropertyMap = Map<string, PropertySettings>

export interface PropertyKind<T = any> {
  from(x: unknown): T
  toString(x: T): string
}

export const protoPropertyMap = new WeakMap<object, PropertyMap>()

export const prop = toFluent(
  PropertySettings,
  settings =>
    (is?: PropertyKind): PropertyDecorator =>
      (proto, key) => {
        if (typeof key !== 'string') return
        settings.is ??= is
        if (!protoPropertyMap.has(proto)) {
          protoPropertyMap.set(proto, new Map([[key, settings]]))
        } else {
          const propertyMap = protoPropertyMap.get(proto)!
          if (propertyMap.has(key)) {
            Object.assign(propertyMap.get(key)!, settings)
          } else {
            propertyMap.set(key, settings)
          }
        }
      }
)

export const attr = prop.attr
export const clone = prop.clone
export const compare = prop.compare
export const is = prop.is
export const out = prop.out
