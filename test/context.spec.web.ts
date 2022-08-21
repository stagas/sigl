/** @env browser */

import { ContextClass } from '../src/context'

describe('Context', () => {
  describe('reduce', () => {
    it('capture active reducer target', () => {
      const target = {
        foo: void 0 as number | void,
        dep: void 0 as number | void,
      }
      const ctx = new ContextClass(target)

      let disposed = 0

      let _fulfill: any
      ctx.$.foo = ctx.fulfill(({ dep: _ }) =>
        cb => {
          _fulfill = cb
          return (() => {
            disposed++
          })
        }
      )

      expect(ctx.$.foo).toBeUndefined()
      expect(_fulfill).toBeUndefined()
      expect(disposed).toBe(0)
      ctx.$.dep = 123
      expect(ctx.$.foo).toBeUndefined()
      _fulfill(1)
      expect(ctx.$.foo).toBe(1)

      expect(disposed).toBe(0)
      ctx.$.dep = 456
      expect(disposed).toBe(1)

      expect(ctx.$.foo).toBe(1)
      _fulfill(42)
      expect(ctx.$.foo).toBe(42)
    })
  })
})
