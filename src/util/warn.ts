import { Fn } from 'everyday-types'

export const warn = <T extends unknown[], R>(fn: Fn<T, R>): Fn<T, R | void> =>
  function(this: any, ...args: T): R | void {
    try {
      return fn.apply(this, args)
    } catch (e) {
      console.warn(e)
    }
  }
