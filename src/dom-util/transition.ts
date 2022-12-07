import type { AnimSettings } from 'animatrix'
import type { StringOf } from 'everyday-types'
import { bool, toFluent } from 'to-fluent'
import $ from '..'
import { State, States } from '../state'

export class TransitionSettings {
  immediate = bool
  expire = bool
  expireAfter = 0
  locked = bool
  pop = bool
  idle = bool
  drop = bool
}

export class Transition<U extends States, V = U[keyof U]> extends EventTarget {
  static from() {
    throw new TypeError('Transition cannot be recreated by its string representation.')
  }

  #modeExpireTime = 0
  #dropExpireTime = 0
  #modeTimeout: any
  #resetModeTimeout: any
  #locked = false

  constructor(
    public state: State<any, any, any>,
    public AnimSettings: Partial<{ [K in StringOf<V>]: AnimSettings }>,
  ) {
    super()
    ;($.on(state) as any).change(() => {
      this.dispatchEvent(new CustomEvent('change'))
    })
  }

  get animSettings() {
    return (this.AnimSettings[this.state.current as StringOf<V>]
      ?? this.AnimSettings[this.state.states.Idle as StringOf<V>]) as AnimSettings
  }

  #resetMode(cb?: (() => void) | null, toIdle?: boolean) {
    clearTimeout(this.#resetModeTimeout)
    this.#resetModeTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        this.#dropExpireTime = 0
        if (!this.state.isIdle) {
          if (toIdle) {
            this.state.returnToIdle()
          } else {
            this.state.pop(this.state.current)
          }
        }
        if (cb) requestAnimationFrame(cb)
      })
    }, (this.AnimSettings[this.state.current as StringOf<V>]?.duration || 50) + 175)
  }

  #setMode(settings: TransitionSettings, mode: StringOf<V>, cb?: () => void) {
    const now = performance.now()

    if (mode === this.state.states.Idle) this.#resetMode(cb, settings.idle)
    else {
      this.#modeExpireTime = now
        + (settings.expireAfter
          ? settings.expireAfter
          : (settings.expire ? this.AnimSettings[mode]?.duration ?? 0 : 0))

      if (settings.drop) this.#dropExpireTime = this.#modeExpireTime
      if (settings.locked) this.#locked = true

      if (mode !== this.state.current) {
        // TODO: this needs to be atomic
        requestAnimationFrame(() => {
          this.state.pushOrSwap(mode)
          // if (!this.state.isIdle) {
          //   this.state.swap(mode)
          // } else {
          //   this.state.push(mode)
          // }
          if (cb) requestAnimationFrame(cb)
          if (settings.pop) this.#resetMode(null, settings.idle)
        })
      } else {
        cb?.()
        if (settings.pop) this.#resetMode(null, settings.idle)
      }
    }
  }

  unlock() {
    this.#locked = false
    this.state.pop(this.state.current)
  }

  to = toFluent(TransitionSettings, settings =>
    (mode: StringOf<V>, cb?: () => void) => {
      // TODO: this is bad design
      if (this.#locked) {
        return
      }

      const now = performance.now()

      if (now < this.#dropExpireTime) {
        return
      }

      clearTimeout(this.#resetModeTimeout)
      clearTimeout(this.#modeTimeout)

      if (now > this.#modeExpireTime || settings.immediate) {
        this.#setMode(settings, mode, cb)
      } else {
        this.#modeTimeout = setTimeout(() => {
          this.#setMode(settings, mode, cb)
        }, this.#modeExpireTime - now)
      }
    })

  get current() {
    return this.toString()
  }

  toString() {
    return this.state.current as any
  }
}

export const transition = <U extends States, V = U[keyof U]>(
  state: State<any, U, V>,
  AnimSettings: Partial<{ [K in StringOf<V>]: AnimSettings }>,
) => new Transition(state, AnimSettings)
