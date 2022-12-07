import { Class, StringKeys } from 'everyday-types'
import { defineProperty, omit, pick } from 'everyday-utils'

import { Context, ContextClass } from './context'
import { PropertySettings, protoPropertyMap } from './decorators'
import $ from './sigl-common'

export type ReactiveClass<T> = Class<T> & {
  propertyMap?: Map<string, PropertySettings>
}

export function reactive<T extends Class<any>>() {
  return (superclass: any): T => {
    const parent = superclass as ReactiveClass<any>

    // get own prototype decorated properties map
    const ownPropertyMap = protoPropertyMap.get(superclass.prototype)! ?? new Map()

    const ctor = class extends parent {
      static get propertyMap() {
        return new Map([...ownPropertyMap, ...(super.propertyMap ?? [])])
      }

      static get exposedPropertyKeys() {
        return [...ctor.propertyMap]
          .filter(([, settings]) => settings.out)
          .map(([key]) => key) as StringKeys<InstanceType<typeof ctor>>[]
      }

      static get clonedPropertyKeys() {
        return [...ctor.propertyMap]
          .filter(([, settings]) => settings.out && settings.clone)
          .map(([key]) => key) as StringKeys<InstanceType<typeof ctor>>[]
      }

      self = this

      $!: Context<T> //& typeof $
      declare context: ContextClass<T>

      declare created?: ($: any) => void

      // goto://context.ts#ContextClass.createMemory
      declare _pendingProperties?: Map<symbol, [string, any[]]>

      constructor(...args: any[]) {
        super(...args)
        ContextClass.attach(this as any, omit($, ['transition']))
        this.context.setupScheduled()
        this.created?.(this.$)
        Object.assign(this, args[0])
      }

      toJSON() {
        const json = pick(this, ctor.exposedPropertyKeys)
        ctor.clonedPropertyKeys.forEach(key => {
          // @ts-ignore
          json[key] = Object.assign({}, json[key])
        })
        return json
      }

      destroy() {
        this.context.cleanup()
      }

      // goto://context.ts#ContextClass.createMemory
      _scheduleProperty(key: string, ...args: any[]) {
        const symbol = Symbol()
        this._pendingProperties ??= new Map()
        this._pendingProperties.set(symbol, [key, args])
        return symbol
      }
    }

    // name the anonymous class with the decorated class' original name
    defineProperty(ctor, 'name', superclass.name)

    return ctor as any
  }
}

// // export interface Foo extends Reactive<Foo> {}

// // @reactive()
// // export class Foo {
// //   foo = 123
// //   created($: Foo['$']) {
// //     $.effect(({ foo }) => {
// //       console.log(foo)
// //     })
// //   }
// // }
// }
