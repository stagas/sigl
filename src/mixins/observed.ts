import $ from '..'
import type { Element } from '../element'

export const observed = () =>
  $.mixin(
    superclass => {
      return class ObservedMixin extends superclass {
        #offsetLeft!: number
        #offsetTop!: number
        #offsetWidth!: number
        #offsetHeight!: number

        get offsetLeft() {
          return this.#offsetLeft
        }
        get offsetTop() {
          return this.#offsetTop
        }
        get offsetWidth() {
          return this.#offsetWidth
        }
        get offsetHeight() {
          return this.#offsetHeight
        }

        #updateOffsets() {
          // @ts-ignore
          this.#offsetLeft = super.offsetLeft
          // @ts-ignore
          this.#offsetTop = super.offsetTop
          // @ts-ignore
          this.#offsetWidth = super.offsetWidth
          // @ts-ignore
          this.#offsetHeight = super.offsetHeight
        }

        matrix = new $.Matrix()
        rect = new $.Rect()

        prevRect = new $.Rect()
        relativeTo?: (Element & { pos: $.Point, rect?: $.Rect, matrix?: $.Matrix }) | false = false

        pos: $.Point = $(this as unknown as Element).reduce(
          ({ $, rect }: any) => $.pos?.equals(rect.pos) ? $.pos : rect.pos
        )

        size: $.Point = $(this as unknown as Element).reduce(
          ({ $, rect }: any) => $.size?.equals(rect.size) ? $.size : rect.size
        )

        get ownRect() {
          // console.log('read', this)
          this.#updateOffsets()
          const offset = $.getElementOffset(this as any)
          return new $.Rect(
            offset.x,
            offset.y,
            this.offsetWidth,
            this.offsetHeight
          )
        }

        declare host: HTMLElement & ObservedMixin & { root?: ShadowRoot }

        mounted($: $.Element<ObservedMixin>['$']) {
          $.rect = $.fulfill(({ host, relativeTo }) =>
            fulfill =>
              $.chain(
                $.observe.resize.initial(host as any, ([_entry]) => {
                  const newRect = host.ownRect
                  // if (entry) {
                  //   newRect = new $.Rect(
                  //     $.rect.x,
                  //     $.rect.y,
                  //     entry.contentBoxSize.inlineSize * 0.5,
                  //     entry.contentBoxSize.blockSize * 0.5
                  //   )
                  //   // console.log('a', entry.contentRect.width)
                  //   // newRect = host.ownRect
                  //   // console.log('b', newRect.width)
                  // } else {
                  // newRect = host.ownRect
                  // }
                  // console.log(e, newRect.toJSON())
                  // console.log(`${newRect}`, this)
                  if (relativeTo) {
                    newRect.translateSelf(relativeTo.pos)
                  }
                  if (!newRect.equals(host.rect)) {
                    // console.log(`${newRect} - ${host.rect}`)
                    // requestAnimationFrame(() => {
                    fulfill(newRect)
                    // })
                  }
                }),
                $.on(host as unknown as HTMLElement).resize(() => {
                  const newRect = host.ownRect
                  // console.log('fulfill!', newRect.x)
                  if (relativeTo) {
                    newRect.translateSelf(relativeTo.pos)
                  }
                  if (!newRect.equals(host.rect)) {
                    fulfill(newRect)
                  } else {
                    if (host.root) {
                      host.root.querySelectorAll('*').forEach(el => {
                        el.dispatchEvent(new CustomEvent('resize', { bubbles: false, composed: false }))
                      })
                    }
                  }
                }),
                $.on(host as never).translate((ev: any) => {
                  const diff = ev.detail
                  // if (applyParentTranslate) {
                  const newRect = $.rect.translate(diff)
                  if (!newRect.equals(host.rect)) {
                    fulfill(newRect)
                  }
                  // } else {
                  host.root?.querySelectorAll('*').forEach(el => {
                    el.dispatchEvent(
                      new CustomEvent('translate', { detail: diff, bubbles: false, composed: false })
                    )
                  })
                  // }
                })
              )
          )

          $.effect(({ host, rect }) => {
            if ($.prevRect.size.equals(rect.size)) {
              const diff = rect.pos.screen($.prevRect.pos)
              if (diff.sum()) {
                // host.querySelectorAll('*').forEach(el => {
                //   el.dispatchEvent(new CustomEvent('translate', { detail: diff, bubbles: false, composed: false }))
                // })
                // if (host.root) {
                //   host.root.querySelectorAll('*').forEach(el => {
                //     // console.log('sending resize to', el)
                //     el.dispatchEvent(new CustomEvent('translate', { detail: diff, bubbles: false, composed: false }))
                //   })
                // }
              }
            } else {
              host.querySelectorAll('*').forEach(el => {
                el.dispatchEvent(new CustomEvent('resize', { bubbles: false, composed: false }))
              })
              if (host.root) {
                host.root.querySelectorAll('*').forEach(el => {
                  // console.log('sending resize to', el)
                  el.dispatchEvent(new CustomEvent('resize', { bubbles: false, composed: false }))
                })
              }
            }
            return () => {
              $.prevRect = rect.clone()
            }
          })
        }
      }
    }
  )
