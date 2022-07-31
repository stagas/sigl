import type {
  Class,
  CustomElementConstructor,
  EventHandler,
  StringKeys,
  StringOf,
  ValueConstructor,
} from 'everyday-types'
import { defineProperty, entries, getOwnProperty, omit, pick } from 'everyday-utils'
import { Hook, hook, render } from 'html-vdom'
import { Component, fromElement, Options } from 'html-vdom/from-element'
import { toFluent } from 'to-fluent'

import { applyAttrs, attrListener, AttrTypes } from './attrs'
import { ContextClass, EffectOptions, FluentFx, Fx, FxFn } from './context'
import { PropertySettings, protoPropertyMap } from './decorators'
import { Events } from './events'
import { RefProxy, Refs } from './refs'

import $ from '.'

export type { Component }

export type LifecycleEvents = {
  mounted: CustomEvent
  unmounted: CustomEvent
}

export interface JsxContext<T> {
  render: FluentFx<T, JSX.Element, void>
  part: FluentFx<T, JSX.Element, () => JSX.Element>
  ref: Refs<T>
}

export type ElementClass = CustomElementConstructor & {
  elementOptions?: Options<any>
  attributeKeys?: string[]
  propertyMap?: Map<string, PropertySettings>
}

export function element<T extends HTMLElement, I = HTMLElement>(
  Element: Class<T>,
  options?: Options<I>,
): Component<T, I>
export function element<I = HTMLElement>(options?: Options<I>): <T extends CustomElementConstructor>(superclass: T) => T
export function element(): <T extends CustomElementConstructor>(superclass: T) => T
export function element(ctorOrOptions?: Class<HTMLElement> | Options<any>, options?: Options<any>) {
  if (typeof ctorOrOptions === 'function') return fromElement(ctorOrOptions, options)
  if (typeof ctorOrOptions === 'object') options = ctorOrOptions
  return (superclass: any) => {
    const parent = superclass as ElementClass

    // get own prototype decorated properties map
    const ownPropertyMap = protoPropertyMap.get(superclass.prototype)! ?? new Map()

    // extract .attr keys
    const ownAttrKeys = [...ownPropertyMap].filter(([, settings]) => settings.attr).map(([key]) => key)

    // map from the lowercase (attribute) version to the actual property name
    const attrKeysMap = new Map(ownAttrKeys.map(x => [x.toLowerCase(), x]))

    // attribute types inferred/assigned at runtime
    const attrTypes = new Map<string, ValueConstructor>()

    // own observed attributes
    const ownObservedAttributes = [...attrKeysMap.keys()]

    //!? 'own observed attributes', ownObservedAttributes, superclass

    // @ts-ignore
    const ctor = class extends parent {
      static get elementOptions() {
        return options ?? super.elementOptions
      }

      static get observedAttributes() {
        return ownObservedAttributes.concat(super.observedAttributes ?? [])
      }

      static get attributeKeys() {
        return ownAttrKeys.concat(super.attributeKeys ?? [])
      }

      static get propertyMap() {
        return new Map([...ownPropertyMap, ...(super.propertyMap ?? [])])
      }

      static get exposedPropertyKeys() {
        return [...ctor.propertyMap]
          .filter(([, settings]) => settings.out)
          .map(([key]) => key) as StringKeys<InstanceType<typeof ctor>>[]
      }

      #isMain = true
      #attrData!: Pick<this, StringKeys<this>>
      #attrInitialUpdates: (() => void)[] = []

      $!: ContextClass<this> & JsxContext<this>
      host = this as unknown as HTMLElement & EventTarget & Events<this, LifecycleEvents>
      declare root?: ShadowRoot

      isMounted = false
      declare context: ContextClass<this> & JsxContext<this>
      declare onmounted: EventHandler<this, CustomEvent>
      declare onunmounted: EventHandler<this, CustomEvent>
      declare mounted?: ($: any) => void
      declare created?: ($: any) => void

      // goto://context.ts#ContextClass.createMemory
      declare _pendingProperties?: Map<symbol, [string, any[]]>

      declare _ctor: Class<any>

      constructor(...args: any[]) {
        super(...args)
        this.#isMain = new.target === ctor
        if (this.#isMain) {
          defineProperty.not.enumerable(this, '_ctor', ctor)
          this.#create()
          Object.assign(this, args[0])
          queueMicrotask(() => {
            this.#flushAttributeUpdates()
          })
        }
      }

      toJSON() {
        return pick(this, ctor.exposedPropertyKeys)
      }

      // goto://context.ts#ContextClass.createMemory
      _scheduleProperty(key: string, ...args: any[]) {
        const symbol = Symbol()
        this._pendingProperties ??= new Map()
        this._pendingProperties.set(symbol, [key, args])
        return symbol
      }

      _getPropertySettings(key: string) {
        return ctor.propertyMap.get(key)
      }

      #applyAttributes() {
        const attrs = pick(this, ctor.attributeKeys as StringKeys<this>[])

        for (const [key, value] of entries(attrs)) {
          const valueCtor = (value as any)?.constructor
          // TODO: maybe turn all as a .is constructor? Boolean needs special case
          if (valueCtor?.from) {
            const settings = ctor.propertyMap.get(key)!
            settings.is = valueCtor
          }
          //!? 'valueCtor', valueCtor.name
          //!? 'value', value
          const type = value == null
            ? AttrTypes.get(String)
            : AttrTypes.get(value as unknown as ValueConstructor)
              ?? (valueCtor
                ? AttrTypes.get(valueCtor as ValueConstructor)
                  /**
                   * if the inputs own class prototype implements toString
                   * then we can use that as the string attribute as
                   * the middleware will perform a .toString()
                   * goto://attrs.ts#AttrTypes
                   */ ?? (Object.hasOwn(valueCtor.prototype, 'toString')
                    ? AttrTypes.get(String)
                    : null)
                : null)
          if (!type) {
            throw new TypeError(
              `Attribute "${key}" is not valid type, must be either: String, Number, Boolean, null, undefined`
            )
          }
          //!? 'type', key, type.toString()
          attrTypes.set(key, type as ValueConstructor)
          attrKeysMap.set(key.toLowerCase(), key)
        }

        //!? 'apply attrs', attrs
        this.#attrData = attrs
        applyAttrs(this, attrs, this.#attrInitialUpdates)
      }

      #flushAttributeUpdates() {
        this.#attrInitialUpdates.splice(0).forEach(fn => fn())
      }

      #attachReactiveContext() {
        ContextClass.attach(this as any, omit($, ['transition']))
        this.host.on = ($.on as any).bind(this, this)
        this.host.dispatch = $.dispatchBind(this) as any
      }

      #registerChangeEvents() {
        const keys = new Set(ctor.exposedPropertyKeys)
        this.$.effect.keys(keys).task(() => {
          $.dispatch.composed(this.host, 'change')
        })
      }

      #create() {
        //!? 'creating', this

        // attach reactive context
        this.#attachReactiveContext()

        // attributes
        this.#applyAttributes()

        // listen for lifecycle events
        $.on(this.host).mounted(() => {
          //!? 'mounted', this

          // we flush here as well as at the queue level
          // because it can be created and mounted before
          // the next tick, so it will be allowed to create
          // attributes at this point.
          this.#flushAttributeUpdates()

          // register 'change' events from @$.out() and @$.attr.out()
          this.#registerChangeEvents()
        })

        $.on(this.host).unmounted(() => {
          //!? 'unmounted', this
          this.$.cleanup()
        })

        // jsx render helpers

        this.$.render = this.$.effect.cb((result: any) => {
          render(result, this.root ?? (this.root = $.shadow(this)))
          //!? 'render', this, result
          return false
        })

        this.$.part = toFluent(
          EffectOptions<this>,
          options =>
            (fn: FxFn<this, JSX.Element>, output?: JSX.Element) => {
              let update: Hook
              const cb = (value: JSX.Element) => {
                output = value
                //!? 'part', this, output
                if (update) queueMicrotask(update)
                return false
              }
              const Fn = () => {
                // lazily create effect when first used
                if (!update)
                  this.$.register(
                    new Fx({ fn, cb, options, dispose: cb })
                  )
                update = hook
                return output
              }
              return Fn
            }
        )

        this.$.ref = RefProxy(this.$)

        this.created?.(this.$)
      }

      // based on: https://stackoverflow.com/a/49773201/175416
      dispatchEvent(this: any, event: Event) {
        const onEventType = `on${event.type}`

        let pass = true

        // run inline listeners
        if (this.#isMain && Object.hasOwn(this, onEventType)) {
          let fn = this[onEventType]

          if (fn) {
            if (!fn) fn = attrListener(this.getAttribute(onEventType)!)
            pass = fn.call(this, event)
          }
        }

        // run prototype on<event>(event) listeners
        if (pass !== false) {
          const fn = getOwnProperty(super.constructor.prototype, onEventType)
          if (fn) pass = fn.call(this, event)
        }

        // run prototype <event>(context, event) listeners
        if (pass !== false) {
          const fn = getOwnProperty(super.constructor.prototype, event.type)
          if (fn) pass = fn.call(this, this.$, event)
        }

        // propagate event if pass is remains true
        if (pass !== false) super.dispatchEvent(event)

        return pass
      }

      connectedCallback() {
        if (!this.#isMain) {
          super.connectedCallback?.()
          return
        }

        //!? 'connected'
        //!dir this
        super.connectedCallback?.()
        if (!this.isMounted) {
          this.isMounted = true
          this.host.dispatch('mounted')
        }
      }

      disconnectedCallback() {
        if (!this.#isMain) {
          super.disconnectedCallback?.()
          return
        }

        super.disconnectedCallback?.()
        // When the element is moved, rather than removed,
        // disconnect and connect events fire together.
        // By observing the state at the end of the task
        // we only fire unmounted when it's been actually
        // removed from the dom and not reconnected
        // immediately.
        queueMicrotask(() => {
          if (!this.isConnected) {
            this.isMounted = false
            this.host.dispatch('unmounted')
          }
        })
      }

      propertyChangedCallback?(
        name: keyof this,
        oldValue: this[keyof this] | null,
        newValue: this[keyof this] | null,
      ): void

      attributeChangedCallback(name: StringOf<keyof this>, oldValue: string | null, newValue: string | null) {
        if (!this.#isMain) {
          super.attributeChangedCallback?.(name, oldValue, newValue)
          return
        }

        //!warn 'attributeChangedCallback:', name, newValue
        let key: StringOf<keyof this>
        if (key = attrKeysMap.get(name) as StringOf<keyof this>) {
          const { is } = ctor.propertyMap.get(key)!
          const prev = this.#attrData[key]
          const next = attrTypes.get(key)!(newValue) as unknown as this[StringOf<keyof this>]

          // type casting comparison for objects that serialize their attribute value
          const isDifferent = is ? prev != next : !Object.is(prev, next)

          //!? 'is different:', isDifferent, name, prev, next
          if (isDifferent) {
            this.#attrData[key] = next

            this[key] = is ? this[key] == next ? this[key] : is.from(next) : next

            //!? 'propertyChangedCallback:', key, next
            this.propertyChangedCallback?.(key, prev, next as unknown as this[StringOf<keyof this>])
          }
        }

        super.attributeChangedCallback?.(name, oldValue, newValue)
      }
    }

    // name the anonymous class with the decorated class' original name
    defineProperty(ctor, 'name', superclass.name)

    return ctor
  }
}
