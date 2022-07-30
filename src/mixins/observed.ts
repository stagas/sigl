import $ from '..'

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

        rect = new $.Rect()

        pos: $.Point = $(this as any).reduce(
          ({ $, rect }: any) => $.pos?.equals(rect.pos) ? $.pos : rect.pos
        )

        size: $.Point = $(this as any).reduce(
          ({ $, rect }: any) => $.size?.equals(rect.size) ? $.size : rect.size
        )

        get ownRect() {
          this.#updateOffsets()
          const offset = $.getElementOffset(this as any)
          return new $.Rect(
            offset.x,
            offset.y,
            this.offsetWidth,
            this.offsetHeight
          )
        }

        declare host: ObservedMixin

        mounted($: $.Element<ObservedMixin>['$']) {
          $.rect = $.fulfill(({ host }) =>
            fulfill => {
              const update = () => fulfill(host.ownRect)
              update()
              $.observe.resize(host as any, update)
            }
          )
        }
      }
    }
  )
