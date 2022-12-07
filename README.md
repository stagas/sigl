

<h1>
sigl <a href="https://npmjs.org/package/sigl"><img src="https://img.shields.io/badge/npm-v2.0.0-F00.svg?colorA=000"/></a> <a href="src"><img src="https://img.shields.io/badge/loc-2,410-FFF.svg?colorA=000"/></a> <a href="https://cdn.jsdelivr.net/npm/sigl@2.0.0/dist/sigl.min.js"><img src="https://img.shields.io/badge/brotli-19.4K-333.svg?colorA=000"/></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F0B.svg?colorA=000"/></a>
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
```

</p>
</details></ul></details><details id="example$worker" title="worker" open><summary><span><a href="#example$worker">#</a></span>  <code><strong>worker</strong></code></summary>  <ul>    <details id="source$worker" title="worker source code" open><summary><span><a href="#source$worker">#</a></span>  <code><strong>view source</strong></code></summary>  <a href="example/worker.ts">example/worker.ts</a>  <p>

```ts
import $ from 'sigl/worker'

interface RxFoo extends $.Reactive<RxFoo> {}
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
```

</p>
</details></ul></details>


## API

<p>  <details id="default$11" title="Namespace" open><summary><span><a href="#default$11">#</a></span>  <code><strong>default</strong></code>    </summary>  <a href=""></a>  <ul>        <p>  <details id="AbortOptions$12" title="TypeAlias" ><summary><span><a href="#AbortOptions$12">#</a></span>  <code><strong>AbortOptions</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.AbortOptions</span></p>        </ul></details><details id="ChildOf$13" title="TypeAlias" ><summary><span><a href="#ChildOf$13">#</a></span>  <code><strong>ChildOf</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ChildOf</span>&lt;<a href="#T$14">T</a>&gt;</p>        </ul></details><details id="Class$15" title="TypeAlias" ><summary><span><a href="#Class$15">#</a></span>  <code><strong>Class</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Class</span>&lt;<a href="#T$16">T</a>&gt;</p>        </ul></details><details id="CleanClass$17" title="TypeAlias" ><summary><span><a href="#CleanClass$17">#</a></span>  <code><strong>CleanClass</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.CleanClass</span>&lt;<a href="#T$18">T</a>&gt;</p>        </ul></details><details id="CleanInstance$19" title="TypeAlias" ><summary><span><a href="#CleanInstance$19">#</a></span>  <code><strong>CleanInstance</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.CleanInstance</span>&lt;<a href="#T$20">T</a>&gt;</p>        </ul></details><details id="Component$21" title="TypeAlias" ><summary><span><a href="#Component$21">#</a></span>  <code><strong>Component</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Component</span>&lt;<a href="#T$22">T</a>, <a href="#I$23">I</a>&gt;</p>        </ul></details><details id="ComponentProps$24" title="TypeAlias" ><summary><span><a href="#ComponentProps$24">#</a></span>  <code><strong>ComponentProps</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ComponentProps</span>&lt;<a href="#T$25">T</a>, <a href="#I$26">I</a>&gt;</p>        </ul></details><details id="Context$27" title="TypeAlias" ><summary><span><a href="#Context$27">#</a></span>  <code><strong>Context</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Context</span>&lt;<a href="#T$28">T</a>&gt;</p>        </ul></details><details id="ContextClass$29" title="TypeAlias" ><summary><span><a href="#ContextClass$29">#</a></span>  <code><strong>ContextClass</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ContextClass</span>&lt;<a href="#T$30">T</a>&gt;</p>        </ul></details><details id="CustomElementConstructor$31" title="TypeAlias" ><summary><span><a href="#CustomElementConstructor$31">#</a></span>  <code><strong>CustomElementConstructor</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.CustomElementConstructor</span></p>        </ul></details><details id="Deps$32" title="TypeAlias" ><summary><span><a href="#Deps$32">#</a></span>  <code><strong>Deps</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Deps</span>&lt;<a href="#T$33">T</a>&gt;</p>        </ul></details><details id="Dispatch$34" title="TypeAlias" ><summary><span><a href="#Dispatch$34">#</a></span>  <code><strong>Dispatch</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Dispatch</span>&lt;<a href="#T$35">T</a>&gt;</p>        </ul></details><details id="DispatchOptions$36" title="TypeAlias" ><summary><span><a href="#DispatchOptions$36">#</a></span>  <code><strong>DispatchOptions</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.DispatchOptions</span></p>        </ul></details><details id="Element$37" title="TypeAlias" ><summary><span><a href="#Element$37">#</a></span>  <code><strong>Element</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Element</span>&lt;<a href="#T$38">T</a>, <a href="#E$39">E</a>&gt;</p>        </ul></details><details id="ElementClass$40" title="TypeAlias" ><summary><span><a href="#ElementClass$40">#</a></span>  <code><strong>ElementClass</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ElementClass</span></p>        </ul></details><details id="EventHandler$41" title="TypeAlias" ><summary><span><a href="#EventHandler$41">#</a></span>  <code><strong>EventHandler</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.EventHandler</span>&lt;<a href="#T$42">T</a>, <a href="#E$43">E</a>&gt;</p>        </ul></details><details id="EventKeys$44" title="TypeAlias" ><summary><span><a href="#EventKeys$44">#</a></span>  <code><strong>EventKeys</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.EventKeys</span>&lt;<a href="#T$45">T</a>&gt;</p>        </ul></details><details id="EventOptions$46" title="TypeAlias" ><summary><span><a href="#EventOptions$46">#</a></span>  <code><strong>EventOptions</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.EventOptions</span></p>        </ul></details><details id="Events$47" title="TypeAlias" ><summary><span><a href="#Events$47">#</a></span>  <code><strong>Events</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Events</span>&lt;<a href="#T$48">T</a>, <a href="#P$49">P</a>&gt;</p>        </ul></details><details id="FxDeps$50" title="TypeAlias" ><summary><span><a href="#FxDeps$50">#</a></span>  <code><strong>FxDeps</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.FxDeps</span>&lt;<a href="#T$51">T</a>&gt;</p>        </ul></details><details id="FxFn$52" title="TypeAlias" ><summary><span><a href="#FxFn$52">#</a></span>  <code><strong>FxFn</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.FxFn</span>&lt;<a href="#T$53">T</a>, <a href="#R$54">R</a>&gt;</p>        </ul></details><details id="HTMLAttributes$55" title="TypeAlias" ><summary><span><a href="#HTMLAttributes$55">#</a></span>  <code><strong>HTMLAttributes</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.HTMLAttributes</span>&lt;<a href="#T$56">T</a>&gt;</p>        </ul></details><details id="Intersect$57" title="TypeAlias" ><summary><span><a href="#Intersect$57">#</a></span>  <code><strong>Intersect</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Intersect</span></p>        </ul></details><details id="JsxContext$58" title="TypeAlias" ><summary><span><a href="#JsxContext$58">#</a></span>  <code><strong>JsxContext</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.JsxContext</span>&lt;<a href="#T$59">T</a>&gt;</p>        </ul></details><details id="Layout$115" title="TypeAlias" ><summary><span><a href="#Layout$115">#</a></span>  <code><strong>Layout</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.mixins.LayoutMixin</span></p>        </ul></details><details id="LifecycleEvents$60" title="TypeAlias" ><summary><span><a href="#LifecycleEvents$60">#</a></span>  <code><strong>LifecycleEvents</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.LifecycleEvents</span></p>        </ul></details><details id="Line$61" title="TypeAlias" ><summary><span><a href="#Line$61">#</a></span>  <code><strong>Line</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Line</span></p>        </ul></details><details id="Matrix$62" title="TypeAlias" ><summary><span><a href="#Matrix$62">#</a></span>  <code><strong>Matrix</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Matrix</span></p>        </ul></details><details id="Mixin$63" title="TypeAlias" ><summary><span><a href="#Mixin$63">#</a></span>  <code><strong>Mixin</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Mixin</span></p>        </ul></details><details id="Morph$64" title="TypeAlias" ><summary><span><a href="#Morph$64">#</a></span>  <code><strong>Morph</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Morph</span></p>        </ul></details><details id="Narrow$65" title="TypeAlias" ><summary><span><a href="#Narrow$65">#</a></span>  <code><strong>Narrow</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Narrow</span>&lt;<a href="#T$66">T</a>, <a href="#U$67">U</a>&gt;</p>        </ul></details><details id="NestedCSSCompiler$68" title="TypeAlias" ><summary><span><a href="#NestedCSSCompiler$68">#</a></span>  <code><strong>NestedCSSCompiler</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.NestedCSSCompiler</span></p>        </ul></details><details id="NestedCSSDeclaration$69" title="TypeAlias" ><summary><span><a href="#NestedCSSDeclaration$69">#</a></span>  <code><strong>NestedCSSDeclaration</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.NestedCSSDeclaration</span></p>        </ul></details><details id="Off$70" title="TypeAlias" ><summary><span><a href="#Off$70">#</a></span>  <code><strong>Off</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Off</span></p>        </ul></details><details id="On$71" title="TypeAlias" ><summary><span><a href="#On$71">#</a></span>  <code><strong>On</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.On</span>&lt;<a href="#T$72">T</a>&gt;</p>        </ul></details><details id="OnEvent$73" title="TypeAlias" ><summary><span><a href="#OnEvent$73">#</a></span>  <code><strong>OnEvent</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.OnEvent</span>&lt;<a href="#T$74">T</a>, <a href="#K$75">K</a>&gt;</p>        </ul></details><details id="OnGetter$76" title="TypeAlias" ><summary><span><a href="#OnGetter$76">#</a></span>  <code><strong>OnGetter</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.OnGetter</span>&lt;<a href="#T$77">T</a>&gt;</p>        </ul></details><details id="Placement$78" title="TypeAlias" ><summary><span><a href="#Placement$78">#</a></span>  <code><strong>Placement</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Placement</span></p>        </ul></details><details id="Point$79" title="TypeAlias" ><summary><span><a href="#Point$79">#</a></span>  <code><strong>Point</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Point</span></p>        </ul></details><details id="Polygon$80" title="TypeAlias" ><summary><span><a href="#Polygon$80">#</a></span>  <code><strong>Polygon</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Polygon</span></p>        </ul></details><details id="Polyline$81" title="TypeAlias" ><summary><span><a href="#Polyline$81">#</a></span>  <code><strong>Polyline</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Polyline</span></p>        </ul></details><details id="Positioned$82" title="TypeAlias" ><summary><span><a href="#Positioned$82">#</a></span>  <code><strong>Positioned</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Positioned</span></p>        </ul></details><details id="PropertyKind$83" title="TypeAlias" ><summary><span><a href="#PropertyKind$83">#</a></span>  <code><strong>PropertyKind</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.PropertyKind</span>&lt;<a href="#T$84">T</a>&gt;</p>        </ul></details><details id="PropsOf$85" title="TypeAlias" ><summary><span><a href="#PropsOf$85">#</a></span>  <code><strong>PropsOf</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.PropsOf</span>&lt;<a href="#T$86">T</a>&gt;</p>        </ul></details><details id="QueueOptions$87" title="TypeAlias" ><summary><span><a href="#QueueOptions$87">#</a></span>  <code><strong>QueueOptions</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.QueueOptions</span></p>        </ul></details><details id="Reactive$88" title="TypeAlias" ><summary><span><a href="#Reactive$88">#</a></span>  <code><strong>Reactive</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Reactive</span>&lt;<a href="#T$89">T</a>&gt;</p>        </ul></details><details id="ReactiveClass$90" title="TypeAlias" ><summary><span><a href="#ReactiveClass$90">#</a></span>  <code><strong>ReactiveClass</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ReactiveClass</span>&lt;<a href="#T$91">T</a>&gt;</p>        </ul></details><details id="Rect$92" title="TypeAlias" ><summary><span><a href="#Rect$92">#</a></span>  <code><strong>Rect</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Rect</span></p>        </ul></details><details id="Ref$93" title="TypeAlias" ><summary><span><a href="#Ref$93">#</a></span>  <code><strong>Ref</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.VRef</span>&lt;<a href="#T$94">T</a>&gt;</p>        </ul></details><details id="RefItem$95" title="TypeAlias" ><summary><span><a href="#RefItem$95">#</a></span>  <code><strong>RefItem</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.RefItem</span>&lt;<a href="#T$96">T</a>&gt;</p>        </ul></details><details id="RefMap$97" title="TypeAlias" ><summary><span><a href="#RefMap$97">#</a></span>  <code><strong>RefMap</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.RefMap</span>&lt;<a href="#T$98">T</a>&gt;</p>        </ul></details><details id="RefSet$99" title="TypeAlias" ><summary><span><a href="#RefSet$99">#</a></span>  <code><strong>RefSet</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.RefSet</span>&lt;<a href="#T$100">T</a>&gt;</p>        </ul></details><details id="Scalar$101" title="TypeAlias" ><summary><span><a href="#Scalar$101">#</a></span>  <code><strong>Scalar</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Scalar</span></p>        </ul></details><details id="Shape$102" title="TypeAlias" ><summary><span><a href="#Shape$102">#</a></span>  <code><strong>Shape</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Shape</span></p>        </ul></details><details id="ShapeLike$103" title="TypeAlias" ><summary><span><a href="#ShapeLike$103">#</a></span>  <code><strong>ShapeLike</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ShapeLike</span></p>        </ul></details><details id="State$104" title="TypeAlias" ><summary><span><a href="#State$104">#</a></span>  <code><strong>State</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.State</span>&lt;<a href="#T$105">T</a>, <a href="#U$106">U</a>&gt;</p>        </ul></details><details id="StateInstance$107" title="TypeAlias" ><summary><span><a href="#StateInstance$107">#</a></span>  <code><strong>StateInstance</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.StateInstance</span></p>        </ul></details><details id="Super$108" title="TypeAlias" ><summary><span><a href="#Super$108">#</a></span>  <code><strong>Super</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Super</span>&lt;<a href="#T$109">T</a>, <a href="#U$110">U</a>&gt;</p>        </ul></details><details id="Task$111" title="TypeAlias" ><summary><span><a href="#Task$111">#</a></span>  <code><strong>Task</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Task</span></p>        </ul></details><details id="ValuesOf$112" title="TypeAlias" ><summary><span><a href="#ValuesOf$112">#</a></span>  <code><strong>ValuesOf</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.ValuesOf</span>&lt;<a href="#T$113">T</a>&gt;</p>        </ul></details><details id="Vec3$114" title="TypeAlias" ><summary><span><a href="#Vec3$114">#</a></span>  <code><strong>Vec3</strong></code>    </summary>  <a href=""></a>  <ul><p><span>sigl.Vec3</span></p>        </ul></details></p></ul></details><details id="default$1" title="Function" open><summary><span><a href="#default$1">#</a></span>  <code><strong>default</strong></code><em>(ctor)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="ctor$4" title="Parameter" ><summary><span><a href="#ctor$4">#</a></span>  <code><strong>ctor</strong></code>    </summary>    <ul><p><a href="#T$3">T</a></p>        </ul></details>  <p><strong>default</strong>&lt;<span>T</span><span>&nbsp;extends&nbsp;</span>     <span>Class</span>&lt;<a href="#T$3">T</a>&gt;&gt;<em>(ctor)</em>  &nbsp;=&gt;  <ul><span>CleanClass</span>&lt;<a href="#T$3">T</a>&gt;</ul></p>  <details id="ctx$7" title="Parameter" ><summary><span><a href="#ctx$7">#</a></span>  <code><strong>ctx</strong></code>    </summary>    <ul><p><a href="#T$6">T</a></p>        </ul></details>  <p><strong>default</strong>&lt;<span>T</span>&gt;<em>(ctx)</em>  &nbsp;=&gt;  <ul><span>ElementWrapper</span>&lt;<a href="#T$6">T</a>&gt;</ul></p>  <details id="ctx$10" title="Parameter" ><summary><span><a href="#ctx$10">#</a></span>  <code><strong>ctx</strong></code>    </summary>    <ul><p><a href="#T$9">T</a></p>        </ul></details>  <p><strong>default</strong>&lt;<span>T</span><span>&nbsp;extends&nbsp;</span>     <span>Reactive</span>&lt;any&gt;&gt;<em>(ctx)</em>  &nbsp;=&gt;  <ul><span>ReactiveWrapper</span>&lt;<a href="#T$9">T</a>&gt;</ul></p></p>    </ul></details></p>

## Credits
- [animatrix](https://npmjs.org/package/animatrix) by [stagas](https://github.com/stagas) &ndash; Create DOM Animations.
- [argtor](https://npmjs.org/package/argtor) by [stagas](https://github.com/stagas) &ndash; Extracts destructured argument names from a function.
- [event-toolkit](https://npmjs.org/package/event-toolkit) by [stagas](https://github.com/stagas) &ndash; Toolkit for DOM events.
- [eventemitter-strict](https://npmjs.org/package/eventemitter-strict) by [moonrailgun](https://github.com/moonrailgun) &ndash; A eventemitter with typescript full support
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
