<h1>
sigl <a href="https://npmjs.org/package/sigl"><img src="https://img.shields.io/badge/npm-v0.0.3-F00.svg?colorA=000"/></a> <a href="src"><img src="https://img.shields.io/badge/loc-1,657-FFF.svg?colorA=000"/></a> <a href="https://cdn.jsdelivr.net/npm/sigl@0.0.3/dist/sigl.min.js"><img src="https://img.shields.io/badge/brotli-15.1K-333.svg?colorA=000"/></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F0B.svg?colorA=000"/></a>
</h1>

<p></p>

Web framework

<h4>
<table><tr><td title="Triple click to select and copy paste">
<code>npm i sigl </code>
</td><td title="Triple click to select and copy paste">
<code>pnpm add sigl </code>
</td><td title="Triple click to select and copy paste">
<code>yarn add sigl</code>
</td></tr></table>
</h4>

## Examples

<details id="example$web" title="web" open><summary><span><a href="#example$web">#</a></span>  <code><strong>web</strong></code></summary>  <ul>    <details id="source$web" title="web source code" ><summary><span><a href="#source$web">#</a></span>  <code><strong>view source</strong></code></summary>  <a href="example/web.tsx">example/web.tsx</a>  <p>

```tsx
/** @jsxImportSource sigl */

import $ from 'sigl'

// simple reactive element

interface ZooElement extends $.Element<ZooElement> {}

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

// an element with events

interface FooEvents {
  jump: CustomEvent<{ height: number }>
}

interface FooElement extends $.Element<FooElement, FooEvents> {}

@$.element()
class FooElement extends $.mix(ZooElement, runnable, swimmable) {
  // dependencies
  Zoo = $.element(ZooElement) // makes a jsx component out of a web component element

  // attributes (reflected in html and reactive to them)
  @$.attr() color = 'blue'
  @$.attr() another = 123
  @$.attr() withCapital = true
  @$.attr() notYet = Boolean

  // properties
  result = 42

  min = 100
  max = 1000

  // example reducers
  scale: number = $(this).reduce(({ min, max }) => max - min)
  normal = $(this).reduce(({ scale, min, result }) => (result - min) / scale)

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
    $.result = $.reduce(({ min, max, result }) =>
      Math.max(min, Math.min(max, result))
    )

    $.onPointerDown = $.reduce(() =>
      $.queue.throttle(100)(_e => {
        //
      }), _ => {})

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
    const Bar = $.part(({ withCapital }) => (
      <div>{withCapital ? 'On' : 'Off'}</div>
    ))

    // main render in animation frame
    $.render((
      { Zoo, hasBananas, color, result, normal, toggle, withCapital },
    ) => (
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

          <button
            onclick={() =>
              $.result = result + 1}
          >
            +
          </button>
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
```

</p>
</details></ul></details>

## API

## Credits

- [animatrix](https://npmjs.org/package/animatrix) by [stagas](https://github.com/stagas) &ndash; Create DOM Animations.
- [argtor](https://npmjs.org/package/argtor) by [stagas](https://github.com/stagas) &ndash; Extracts destructured argument names from a function.
- [event-toolkit](https://npmjs.org/package/event-toolkit) by [stagas](https://github.com/stagas) &ndash; Toolkit for DOM events.
- [everyday-types](https://npmjs.org/package/everyday-types) by [stagas](https://github.com/stagas) &ndash; Everyday utility types
- [everyday-utils](https://npmjs.org/package/everyday-utils) by [stagas](https://github.com/stagas) &ndash; Everyday utilities
- [geometrik](https://npmjs.org/package/geometrik) by [stagas](https://github.com/stagas) &ndash; Geometry classes and utils.
- [get-element-offset](https://npmjs.org/package/get-element-offset) by [stagas](https://github.com/stagas) &ndash; Get accurate DOM element offset.
- [html-vdom](https://npmjs.org/package/html-vdom) by [stagas](https://github.com/stagas) &ndash; JSX virtual DOM using standard HTML
- [is-mobile-agent](https://npmjs.org/package/is-mobile-agent) by [stagas](https://github.com/stagas) &ndash; Singleton boolean that is true when user agent is mobile or tablet.
- [nested-css](https://npmjs.org/package/nested-css) by [stagas](https://github.com/stagas) &ndash; compile nested css rules
- [proxy-toolkit](https://npmjs.org/package/proxy-toolkit) by [stagas](https://github.com/stagas) &ndash; Proxy toolkit.
- [to-fluent](https://npmjs.org/package/to-fluent) by [stagas](https://github.com/stagas) &ndash; Convert a function with a settings object to fluent API.
- [ts-functional-pipe](https://npmjs.org/package/ts-functional-pipe) by [Chris Sperry](https://github.com/biggyspender) &ndash; Heavily overloaded functions (pipe/compose) for type-safe function composition in TypeScript

## Contributing

[Fork](https://github.com/stagas/sigl/fork) or [edit](https://github.dev/stagas/sigl) and submit a PR.

All contributions are welcome!

## License

<a href="LICENSE">MIT</a> &copy; 2022 [stagas](https://github.com/stagas)
