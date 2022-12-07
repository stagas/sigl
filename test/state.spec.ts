// @env browser

import { State } from '../src/state'

describe('State', () => {
  it('works', () => {
    const Foo = {
      Idle: 'idle',
      One: 'one',
      Two: 'two',
    }
    const state = new State(Foo)
    expect(state.current).toBe(Foo.Idle)
    state.push(Foo.One)
    expect(state.current).toBe(Foo.One)
    state.pop(Foo.One)
    expect(state.current).toBe(Foo.Idle)
  })

  it('guard', () => {
    const Foo = {
      Idle: 'idle',
      One: 'one',
      Two: 'two',
    }

    const Guard = {
      [Foo.Idle]: { push: [Foo.One] },
      [Foo.One]: { push: [Foo.Two] },
    }

    const state = new State(Foo, Guard)

    expect(state.current).toBe(Foo.Idle)

    expect(() => {
      state.push(Foo.Two)
    }).toThrow('Invalid')

    state.push(Foo.One)
    expect(state.current).toBe(Foo.One)
    state.push(Foo.Two)
    expect(state.current).toBe(Foo.Two)

    expect(() => {
      state.push(Foo.Idle)
    }).toThrow('Invalid')

    state.pop(Foo.Two)
    expect(state.current).toBe(Foo.One)

    expect(() => {
      state.pop(Foo.Two)
    }).toThrow('current state')

    state.pop(Foo.One)
    expect(state.current).toBe(Foo.Idle)
  })

  it('guard swap allowed', () => {
    const Foo = {
      Idle: 'idle',
      One: 'one',
      Two: 'two',
      OtherOne: 'otherone',
    }

    const Guard = {
      [Foo.Idle]: { push: [Foo.One, Foo.OtherOne] },
      [Foo.One]: { push: [Foo.Two] },
    }

    const state = new State(Foo, Guard)

    expect(state.current).toBe(Foo.Idle)
    state.push(Foo.One)
    expect(state.current).toBe(Foo.One)
    state.push(Foo.Two)
    expect(state.current).toBe(Foo.Two)

    expect(() => {
      state.swap(Foo.OtherOne)
    }).toThrow('Invalid')

    state.pop(Foo.Two)
    expect(state.current).toBe(Foo.One)

    state.swap(Foo.OtherOne)
    expect(state.current).toBe(Foo.OtherOne)

    state.pop(Foo.OtherOne)
    expect(state.current).toBe(Foo.Idle)
  })

  it('guard swap protected', () => {
    const Foo = {
      Idle: 'idle',
      One: 'one',
      Two: 'two',
      OtherOne: 'otherone',
      DifferentOne: 'differentone',
    }

    const Guard = {
      [Foo.Idle]: { push: [Foo.One, Foo.OtherOne, Foo.DifferentOne] },
      [Foo.One]: { push: [Foo.Two], swap: [Foo.DifferentOne] },
    }

    const state = new State(Foo, Guard)

    expect(state.current).toBe(Foo.Idle)
    state.push(Foo.One)
    expect(state.current).toBe(Foo.One)
    state.push(Foo.Two)
    expect(state.current).toBe(Foo.Two)

    expect(() => {
      state.swap(Foo.OtherOne)
    }).toThrow('Invalid')

    state.pop(Foo.Two)
    expect(state.current).toBe(Foo.One)

    expect(() => {
      state.swap(Foo.OtherOne)
    }).toThrow('Invalid')

    state.swap(Foo.DifferentOne)
    expect(state.current).toBe(Foo.DifferentOne)

    state.pop(Foo.DifferentOne)
    expect(state.current).toBe(Foo.Idle)
  })
})
