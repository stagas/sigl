/** @env browser */

/** @jsxImportSource ../src */

import $ from '../src'

let id = 99

describe('sigl', () => {
  it('works', () => {
    interface Foo extends $.Element<Foo, FooEvents> {}

    interface FooEvents {
      jump: CustomEvent<{ height: number }>
    }

    @$.element()
    class Foo extends HTMLElement {
      @$.attr() color = 'blue'
      @$.attr() another = 123
      @$.attr() withCapital = true
      @$.attr() notYet = Boolean

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

    customElements.define('x-foo', Foo)
    const foo = new Foo()
    foo.onmounted = () => {}
    foo.host.onmounted = () => {}
    foo.onjump
    foo.host.onjump
    foo.button
    foo.color

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

    interface Bar extends $.Element<Bar> {}

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

    interface Foo extends $.Element<Foo> {}

    let seen = 0

    let parentSeen = 0
    let childSeen = 0

    @$.element()
    class Foo extends $(Bar) {
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
    // throw new SyntaxError('asdasdyeah')
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
})
