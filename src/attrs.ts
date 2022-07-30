import type { Keys, StringOf, ValueConstructor } from 'everyday-types'
import { accessors } from 'everyday-utils'

/** @module attrs */

export type Attrs<T> = {
  [K in keyof T]: T[K] extends ValueConstructor ? ReturnType<T[K]> : T[K]
}

export const AttrTypes = new Map<ValueConstructor, (x: any) => string | number | boolean>([
  [String, (x: any): string => x.toString()],
  [Number, (x: any): number => parseFloat(x)],
  [Boolean, (x: any): boolean => (x = x === false ? false : x != null)],
])

export const applyAttrs = <T extends object>(
  self: any,
  data: Record<StringOf<keyof T>, T[StringOf<keyof T>] | void>,
  initialUpdates: (() => void)[],
) => {
  for (const [k, v] of Object.entries(data) as [StringOf<keyof T>, any][]) {
    //!? 'setting attr "%s"', k, v.toString()
    if ([String, Number, Boolean].includes(v)) self[k] = data[k] = void 0
    else if (v === true) (data as any)[k] = true
    else if (typeof v === 'object') data[k] = v.toString()
    //!? 'written attr:', data[k]
  }

  const update = (attr: any, key: any, value: any) => {
    if (typeof value === 'boolean') {
      if (value) {
        self.setAttribute(attr, '')
      } else {
        if (self.hasAttribute(attr)) {
          self.removeAttribute(attr)
        } else {
          // if the attribute is initially in the class as = true
          // but the actual html element doesn't have the attribute
          // then the removeAttribute() will not trigger
          // the attributeChangedCallback(), and the value will
          // stay at 'true' forever.
          ;(data as any)[key] = false
        }
      }
    } else {
      //!? 'setting', attr, value
      self.setAttribute(attr, value)
    }
  }

  return accessors(self, data, <K extends Keys<T>>(key: StringOf<K>) => {
    const attr = key.toLowerCase()
    return {
      get: () => data[key],
      set(value: T[K]) {
        //!warn 'setter changed', key, value
        if (!self.isConnected) initialUpdates.push(() => update(attr, key, value))
        else update(attr, key, value)
      },
    }
  })
}

export const attrListener = (body: string) =>
  new Function(
    'event',
    `with(this){let fn=${body};return typeof fn=='function'?fn.call(this,event):fn}`
  )
