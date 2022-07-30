import { toFluent } from 'to-fluent'

export class PropertySettings {
  attr = false
  out = false
  is?: PropertyKind
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
export const out = prop.out
export const is = prop.is
