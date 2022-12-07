/** @jsxImportSource ../src */

import $ from '../src'

// simple reactive element

interface ZooElement extends $.Element<ZooElement> { }

@$.element()
class ZooElement extends HTMLElement {
  @$.out() bananas = 0
  mounted($: this['$']) {
    $.render(({ bananas }) => (
      <div>
        {bananas} bananas
        <button onclick={() => $.bananas = bananas + 1}>+</button>
        <button onclick={() => $.bananas = bananas - 1}>-</button>
      </div>
    ))
  }
}

// example mixin

const runnable = $.mixin(superclass =>
  class extends superclass {
    speed = 10
  }
)

const swimmable = $.mixin(superclass =>
  class extends superclass {
    depth = 10
  }
)

// a plain reactive class

interface RxFoo extends $.Reactive<RxFoo> { }
@$.reactive()
class RxFoo {
  // properties
  result = 555

  min = 100
  max = 1000

  // example reducers
  scale = $(this).reduce(({ min, max }) => max - min)
  normal = $(this).reduce(({ scale, min, result }) => (result - min) / scale)
}

const rx = new RxFoo()
console.log(rx.normal)

// an element with events

interface FooEvents {
  jump: CustomEvent<{ height: number }>
}

interface FooElement extends $.Element<FooElement, FooEvents> { }

@$.element()
class FooElement extends $.mix(ZooElement, runnable, swimmable) {
  // dependencies
  Zoo = $.element(ZooElement) // makes a jsx component out of a web component element

  // attributes (reflected in html and reactive to them)
  @$.attr() color = 'blue'
  @$.attr() another = 123
  @$.attr() withCapital = true
  @$.attr() notYet = $.Boolean

  // properties
  result = 42

  min = 100
  max = 1000

  // example reducers
  scale = $(this).reduce(({ min, max }) => max - min)
  normal = $(this).reduce(({ scale, min, result }) => (result - min) / scale)

  inverted = $(this).fulfill(({ normal }) => fulfill => fulfill(-normal), 0)

  // example callback that mutates state
  toggle = $(this).callback(({ $, withCapital }) => (() => {
    $.withCapital = !withCapital
  }))

  // a ref we fill at render
  button?: HTMLButtonElement

  // a ref that we will be attaching effects on
  @$.out() zoo?: ZooElement
  hasBananas = false

  onPointerDown?: $.EventHandler<FooElement, PointerEvent>

  mounted($: this['$']) {
    // example reducer with circular dependency
    $.result = $.reduce(({ min, max, result }) => Math.max(min, Math.min(max, result)))

    $.onPointerDown = $.reduce(() =>
      $.queue.throttle(100)(_e => {
        //
      }), _ => { })

    // mixins test
    $.effect(({
      speed,
      depth,
    }) => {
      const s = speed
      const d = depth
      console.log('got speed and depth from mixins', s, d)
    })

    $.effect(({ host }) => {
      // html property listeners work like with regular elements
      host.onjump = ({ detail: { height } }) => {
        console.log(height)
      }

      // $.on has type access to all possible events (click etc)
      $.on(host).jump(({ detail: { height } }) => {
        console.log(height)
      })
      // host.on has type access only to our own host events
      host.on('jump').once.passive($.atomic(({ detail: { height } }) => {
        console.log('height', height)
      }))

      // $.dispatch has type access to all possible events (click etc)
      $.dispatch.bubbles.composed(host, 'jump', { height: 456 })
      // host.dispatch has type access only to our own host events
      host.dispatch.bubbles('jump', { height: 123 })
    })

    // example of the ref of the 'button' element firing when filled
    // and assigning a click handler with preventDefault + stopPropagation mods
    $.effect(({ button }) => $.on(button).click.prevent.stop(console.log))

    // example of being reactive to state from foreign elements
    $.effect(({ zoo }) =>
      // apply effect on raf (requestAnimationFrame)
      zoo.$.effect.raf(({ bananas }) => {
        $.hasBananas = !!bananas
      })
    )

    $.effect(() => {
      return () => {
        console.log('disconnected')
      }
    })

    // this part can be inserted in the render below but will only appear
    // when its dependencies are met. both .part and .render also accept a
    // second argument, which is the default output when it's not yet fulfilled
    const Bar = $.part(({ withCapital }) => <div>{withCapital ? 'On' : 'Off'}</div>)

    // main render in animation frame
    $.render(({ Zoo, hasBananas, color, result, normal, toggle, withCapital }) => (
      <>
        <style>
          {$.css /*css*/`

          /* top level is :host */
          display: block;
          background: #444;

          button {
            /* an example of conditional css using regular string templating */
            background: ${withCapital ? 'pink' : 'purple'};

            /* sass style nesting */
            &:hover {
              background: orange;
            }
          }

          `(/* here we can set a different top level selector, default is :host */)}
        </style>
        <div>
          <button
            ref={$.ref.button}
            onclick={$.event.stop(() => {
              $.color = color === 'red'
                ? 'blue'
                : 'red'
            })}
          >
            Toggle inline
          </button>

          color: {color}

          <hr />

          <Zoo ref={$.ref.zoo} />

          {hasBananas
            ? ($.zoo!.bananas) < 0
              ? 'bananas?'
              : 'bananas!!'
            : 'no bananas :('}

          <hr />

          result: {result}

          <button onclick={() => $.result = result + 1}>+</button>
          <button onclick={() => $.result = result - 1}>-</button>

          <hr />

          normal: {normal.toFixed(3)}

          <hr />

          <Bar />

          <button
            onclick={$.event.prevent.throttle(500)(() => {
              $.withCapital = !withCapital
            })}
          >
            Toggle throttled inline
          </button>

          <button onclick={$.queue.throttle(300)(toggle)}>
            Toggle method
          </button>
        </div>
      </>
    ))
  }
}

customElements.define('x-foo', FooElement)
const foo = new FooElement()
document.body.appendChild(foo)
foo.setAttribute('color', 'red')

interface BarElement extends $.Element<BarElement> { }

@$.element()
class BarElement extends $.inherit(FooElement) {
}

customElements.define('x-bar', BarElement)
new BarElement()

interface XElement extends $.Element<XElement> { }

@$.element()
class XElement extends $.mix(HTMLElement, $.mixins.observed()) {
  @$.out() foo = 123
}

customElements.define('x-x', XElement)
// new BarElement()
