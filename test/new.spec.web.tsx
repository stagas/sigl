/** @env browser */

/** @jsxImportSource ../src */

import { tick } from 'everyday-utils'
import { serialize } from 'serialize-whatever'
import $ from '../src'

let id = 0

describe('sigl', () => {
  describe('attrs', () => {
    it('cast number', () => {
      interface Foo extends $.Element<Foo> { }
      @$.element()
      class Foo extends HTMLElement {
        @$.attr() another = 123
      }
      customElements.define('x-foo' + id++, Foo)
      const foo = new Foo()
      expect(foo.another).toBe(123)
      foo.setAttribute('another', 'xyz')
      expect(foo.another).toBe(NaN)
    })

    it('delayed boolean', () => {
      interface Foo extends $.Element<Foo> { }
      @$.element()
      class Foo extends HTMLElement {
        @$.attr() flag = $.Boolean
      }
      customElements.define('x-foo' + id++, Foo)
      const foo = new Foo()
      expect(foo.flag).toBeUndefined()
      // foo.setAttribute('another', 'xyz')
      // expect(foo.another).toBe(NaN)
    })
  })

  it('works', () => {
    interface Foo extends $.Element<Foo, FooEvents> { }

    interface FooEvents {
      jump: CustomEvent<{ height: number }>
    }

    @$.element()
    class Foo extends HTMLElement {
      @$.attr() color = 'blue'
      @$.attr() another = 123
      @$.attr() withCapital = true
      @$.attr() notYet = $.Boolean

      button?: HTMLButtonElement
      result?: number = 123

      root = $.shadow(this)

      mounted() {
        const { $ } = this

        this.result = 5353

        $.effect(({ host }) => {
          host.onjump = ({ detail: { height } }) => {
            console.log(height)
          }
          host.on('jump')(({ detail: { height } }) => {
            console.log('height', height)
          })
          host.dispatch('jump', { height: 123 })
        })

        $.effect(({ notYet }) => {
          if (notYet) {
            // console.log('notYet:', notYet)
          }
        })

        $.render(({ color }) => (
          <div>
            {color}
            <button ref={$.ref.button}>click me</button>
          </div>
        ))
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    // foo.onmounted = () => {}
    // foo.host.onmounted = () => {}
    // foo.onjump
    // foo.host.onjump
    // foo.button
    // foo.color

    foo.setAttribute('color', 'red')
    expect(foo.getAttribute('color')).toBe('red')
    expect(foo.color).toBe('red')

    foo.setAttribute('another', 'red')
    expect(foo.getAttribute('another')).toBe('red') // TODO: this should be NaN but attrs aren't active yet
    expect(foo.another).toBe(NaN)
    foo.setAttribute('another', '456')
    expect(foo.getAttribute('another')).toBe('456')
    expect(foo.another).toBe(456)

    foo.toggleAttribute('withCapital')
    expect(foo.hasAttribute('withCapital')).toBe(true)
    expect(foo.withCapital).toBe(true)

    foo.toggleAttribute('withcapital')
    expect(foo.hasAttribute('withcapital')).toBe(false)
    expect(foo.withCapital).toBe(false)

    expect(foo.root.innerHTML).toBe('')
    document.body.appendChild(foo)
    expect(foo.root.innerHTML).toBe('<div>red<button>click me</button></div>')

    // foo.toggleAttribute('withcapital')
    expect(foo.hasAttribute('notyet')).toBe(false)
    expect(foo.notYet).toBeUndefined()
    foo.toggleAttribute('notyet')
    expect(foo.hasAttribute('notyet')).toBe(true)
    expect(foo.notYet).toBe(true)
    foo.toggleAttribute('notyet')
    expect(foo.hasAttribute('notyet')).toBe(false)
    expect(foo.notYet).toBe(false)
  })

  it('inheritance works', () => {
    const called: number[] = []
    let calledIndex = 0

    // const ctorCalled: number[] = []
    // let ctorIndex = 0

    let listenerCalled = 0

    interface Bar extends $.Element<Bar> { }

    @$.element()
    class Bar extends HTMLElement {
      @$.attr() parentObserved = true
      // constructor(is) {
      //   super(true)
      //   console.log(is)
      //   ctorCalled.push(ctorIndex++)
      // }
      mounted($: this['$']) {
        called.push(calledIndex++)
        $.effect(({ parentObserved: _ }) => {
          parentSeen++
        })
      }
    }

    interface Foo extends $.Element<Foo> { }

    let seen = 0

    let parentSeen = 0
    let childSeen = 0

    @$.element()
    class Foo extends $.inherit(Bar) {
      observed = true
      // constructor(is) {
      //   super(true)
      //   console.log(is)
      //   ctorCalled.push(ctorIndex++)
      // }
      mounted($: this['$']) {
        called.push(calledIndex++)
        $.effect(({ observed: _ }) => {
          seen++
        })

        $.effect(({ parentObserved: _ }) => {
          childSeen++
        })
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    foo.onmounted = () => listenerCalled++
    document.body.appendChild(foo)

    expect(called).toEqual([0, 1])
    // expect(ctorCalled).toEqual([0, 1])
    expect(listenerCalled).toBe(1)
    expect(seen).toBe(1)
    expect(parentSeen).toBe(1)
    expect(childSeen).toBe(1)

    customElements.define('x-foo' + id++, Bar)
    const bar = new Bar()
    bar.onmounted = () => listenerCalled++
    document.body.appendChild(bar)

    expect(called).toEqual([0, 1, 2])
    expect(listenerCalled).toBe(2)
    expect(seen).toBe(1)
    expect(parentSeen).toBe(2)
    expect(childSeen).toBe(1)
  })

  it('dispatching events', () => {
    const called: string[] = []
    @$.element()
    class Zoo extends HTMLElement {
      // @ts-ignore
      onclick() {
        called.push('zoo-click')
      }
      onyo() {
        called.push('zoo-yo')
      }
      mounted() {
        called.push('zoo-mounted')
      }
    }

    @$.element()
    class Bar extends Zoo {
      onyo() {
        called.push('bar-yo')
      }
      mounted() {
        called.push('bar-mounted')
      }
    }

    @$.element()
    class Foo extends Bar {
      onyo() {
        called.push('foo-yo')
      }
      onclick() {
        called.push('foo-click')
      }
      mounted() {
        called.push('foo-mounted')
      }
    }

    customElements.define('x-foo' + id++, Foo)

    const foo = new Foo()
    foo.onclick = () => {
      called.push('inline-click')
    }
    foo.onyo = () => {
      called.push('inline-yo')
    }
    foo.dispatchEvent(new MouseEvent('click'))
    foo.dispatchEvent(new CustomEvent('yo'))
    expect(called).toEqual([
      'inline-click',
      'foo-click',
      'zoo-click',
      'inline-yo',
      'foo-yo',
      'bar-yo',
      'zoo-yo',
    ])
    document.body.appendChild(foo)
    expect(called).toEqual([
      'inline-click',
      'foo-click',
      'zoo-click',
      'inline-yo',
      'foo-yo',
      'bar-yo',
      'zoo-yo',
      'foo-mounted',
      'bar-mounted',
      'zoo-mounted',
    ])
  })

  it('prop reducers', async () => {
    interface Foo extends $.Element<Foo> { }

    @$.element()
    class Foo extends HTMLElement {
      min = 30
      max = 100
      value = 50
      scale = $(this).reduce(({ min, max }) => max - min)
      normal = $(this).reduce(({ min, scale, value }) => (value - min) / scale)

      root = $.shadow(this)

      mounted($: this['$']) {
        $.render(({ normal }) => <div>{normal}</div>)
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    document.body.appendChild(foo)
    expect(foo.root.innerHTML).toMatchSnapshot()
  })

  it('mixins', async () => {
    interface Foo extends $.Element<Foo> { }

    const order: string[] = []

    const runnable = $.mixin(superclass =>
      class extends superclass {
        speed = 10
        mounted() {
          order.push('runnable')
        }
      }
    )

    const swimmable = $.mixin(superclass =>
      class extends superclass {
        depth = 10
        mounted($: $.Element<this>['$']) {
          $.depth
          order.push('swimmable')
        }
      }
    )

    @$.element()
    class Foo extends $.mix(HTMLElement, runnable, swimmable) {
      root = $.shadow(this)
      mounted($: this['$']) {
        order.push('foo')
        $.render(({ speed, depth }) => <div>{speed * depth}</div>)
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    document.body.appendChild(foo)
    expect(foo.root.innerHTML).toMatchSnapshot()
    expect(order).toMatchSnapshot()
  })

  it('constructor state argument', async () => {
    interface Foo extends $.Element<Foo> { }

    @$.element()
    class Foo extends $.inherit(HTMLElement) {
      value = 123
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo({ value: 456 })
    document.body.appendChild(foo)
    expect(foo.value).toBe(456)
  })

  it('refs', async () => {
    interface Foo extends $.Element<Foo> { }

    @$.element()
    class Foo extends HTMLElement {
      button?: HTMLButtonElement
      mounted($: this['$']) {
        $.render(() => <button ref={$.ref.button}>press</button>)
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    document.body.appendChild(foo)
    await tick()
    expect(foo.button).toBeInstanceOf(HTMLButtonElement)
  })

  it('ref map', async () => {
    interface ButtonElement extends $.Element<ButtonElement> { }
    @$.element()
    class ButtonElement extends $.inherit(HTMLElement) { }
    const Button = $.element(ButtonElement)

    interface Foo extends $.Element<Foo> { }

    let count = 0

    @$.element()
    class Foo extends HTMLElement {
      buttons = new $.RefMap<ButtonElement>([
        ['foo', {}],
        ['bar', {}],
      ])
      mounted($: this['$']) {
        $.effect(({ buttons: _ }) => {
          count++
        })
        $.render(({ buttons }) => buttons.map(item => <Button key={item.ref.key} {...item}>press</Button>))
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    document.body.appendChild(foo)
    expect(count).toBe(1)
    await tick()
    expect(foo.buttons.get('foo')!.ref.current).toBeInstanceOf(ButtonElement)
    expect(foo.buttons.get('bar')!.ref.current).toBeInstanceOf(ButtonElement)
    expect(count).toBe(3)
  })

  // it('ref map recover', async () => {
  //   interface BarElement extends $.Element<BarElement> {}
  //   @$.element()
  //   class BarElement extends $(HTMLElement) {
  //     @$.attr() value = 0
  //     root = this
  //     mounted($: this['$']) {
  //       $.render(({ value }) => <span>{value}</span>)
  //     }
  //   }

  //   let count = 0

  //   interface Foo extends $.Element<Foo> {}
  //   @$.element()
  //   class Foo extends HTMLElement {
  //     Bar = $.element(BarElement)

  //     bars = [
  //       { key: 'foo', current: new BarElement({ value: 123 }) },
  //       { key: 'bar', current: new BarElement({ value: 456 }) },
  //     ]

  //     root = this

  //     mounted($: this['$']) {
  //       $.effect(({ bars: _ }) => {
  //         count++
  //       })
  //       $.render(({ Bar, bars }) => (
  //         bars.map(ref => <Bar key={ref.key} ref={ref} />)
  //       ))
  //     }
  //   }

  //   customElements.define('x-foo' + id++, Foo)
  //   const foo = new Foo()
  //   document.body.appendChild(foo)
  //   expect(count).toBe(1)
  //   await tick()
  //   // expect(foo.bars.get('foo')!.current).toBeInstanceOf(BarElement)
  //   // expect(foo.bars.get('bar')!.current).toBeInstanceOf(BarElement)
  //   expect(count).toBe(1)
  //   expect(foo.innerHTML).toMatchSnapshot()
  // })

  it('serializing', async () => {
    interface Foo extends $.Element<Foo> { }

    @$.element()
    class Foo extends $.inherit(HTMLElement) {
      @$.out() value = 123
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo({ value: 456 })
    document.body.appendChild(foo)
    expect(foo.value).toBe(456)
    expect(foo.toJSON()).toEqual({
      value: 456,
    })
  })

  it('serializing ref map', async () => {
    interface BarElement extends $.Element<BarElement> { }
    @$.element()
    class BarElement extends $.inherit(HTMLElement) {
      @$.attr.out() value = 0
      root = this
      mounted($: this['$']) {
        $.render(({ value }) => <span>{value}</span>)
      }
    }

    let count = 0

    interface Foo extends $.Element<Foo> { }
    @$.element()
    class Foo extends HTMLElement {
      Bar = $.element(BarElement)

      @$.out() bars = new $.RefMap<BarElement>([
        ['foo', { value: 123 }],
        ['bar', { value: 456 }],
      ])

      root = this

      mounted($: this['$']) {
        $.effect(({ bars: _ }) => {
          count++
        })
        $.render(({ Bar, bars }) => (
          bars.map(item => <Bar {...item} />)
        ))
      }
    }

    customElements.define('x-foo' + id++, Foo)
    const foo = new Foo()
    document.body.appendChild(foo)
    expect(count).toBe(1)
    await tick()
    // expect(foo.bars.get('foo')!.current).toBeInstanceOf(BarElement)
    // expect(foo.bars.get('bar')!.current).toBeInstanceOf(BarElement)
    expect(count).toBe(3)
    // expect(foo.innerHTML).toMatchSnapshot()
    expect(serialize(foo, 2)).toMatchSnapshot()
  })

  it('state', () => {
    type FooEvents = {
      statechange: CustomEvent<$.StateInstance>
      // handlestart: CustomEvent
      handleend: CustomEvent
    }

    const FooState = {
      Idle: 'idle',
      Handle: 'handle',
    } as const

    interface FooElement extends $.Element<FooElement, FooEvents> { }

    let mountedState: any

    @$.element()
    class FooElement extends HTMLElement {
      @$.attr() state = $(this).state(FooState)

      mounted($: FooElement['$']) {
        $.effect(({ state }) => {
          mountedState = state
        })
      }
      //   $.effect(({ state }) => {
      //     $.state.push(FooState.Handle)
      //     $.state.pop(FooState.Handle)
      //     state.cancel(FooState.Handle)
      //     // const x = state.current
      //     $.on(state).handlestart(() => {
      //       //
      //     })
      //   })
      // }
    }

    customElements.define('x-foo' + id++, FooElement)
    const foo = new FooElement()
    document.body.appendChild(foo)
    // expect(foo.state).toBe(FooState.Idle)
    expect(foo.$.state).toBeInstanceOf($.State)
    expect(mountedState).toBeInstanceOf($.State)
    // TODO: assert
  })
})
