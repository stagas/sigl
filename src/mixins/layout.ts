import $ from '..'

export interface LayoutMixin extends $.Element<LayoutMixin> {
  rect?: $.Rect
  pos?: $.Point
  size?: $.Point
  matrix?: $.Matrix
  scale: number
  layout?: LayoutMixin
  layoutRect?: $.Rect
  computedRect?: $.Rect
  fixed?: boolean
}

export const layout = () => $.mixin((superclass): $.Class<LayoutMixin> => {
  interface Layout extends LayoutMixin { }
  @$.element()
  class Layout extends superclass {
    @$.compare($.Rect.compare)()
    rect?: $.Rect

    @$.compare($.Point.compare)()
    pos?= $(this).reduce(
      ({ rect }) => rect.pos.round())

    @$.compare($.Point.compare)()
    size?= $(this).reduce(
      ({ rect }) => rect.size.round())

    matrix?: $.Matrix = $(this).fulfill(
      ({ layout }) => (fulfill) =>
        layout.$.effect.raf(
          ({ matrix }) => {
            fulfill(matrix)
          }))

    scale = 1

    layout?: LayoutMixin

    @$.compare($.Rect.compare)()
    layoutRect: $.Rect = $(this).fulfill(
      ({ layout }) => (fulfill) =>
        layout.$.effect.raf(
          ({ rect, layoutRect }) => {
            fulfill(rect.translate(layoutRect.pos).round())
          }))

    fixed?: boolean = $(this).fulfill(
      ({ layout }) =>
        (fulfill) =>
          layout.$.effect(
            ({ fixed }) => {
              fulfill(fixed)
            }))

    // computedRect?: $.Rect = $(this).reduce(({ layoutRect, matrix, rect }) => {
    //   const computedRect = rect.translate(layoutRect).transform(matrix)
    //   return computedRect
    // })

    mounted($: Layout['$']) {
      $.effect(({ rect }) => {
        const rounded = rect.round()
        if (!rounded.equals(rect)) {
          $.rect = rounded
        }
      })
    }

    // $.effect(({ computedRect }) => {
    //   const div = computedRect.draw()
    //   div.style.overflow = 'hidden'
    //   div.style.lineHeight = '4px'

    //   const label = document.createElement('span')
    //   label.textContent = this.constructor.name.split('Element')[0]
    //   label.style.width = '100%'
    //   label.style.fontFamily = 'sans-serif'
    //   label.style.fontSize = '7px'
    //   label.style.background = '#000'
    //   label.style.whiteSpace = 'wrap'
    //   label.style.wordBreak = 'break-all'

    //   div.appendChild(label)

    //   div.onpointerover = () => {
    //     console.log(this)
    //   }
    //   // div.style.pointerEvents = 'all'
    //   return () => {
    //     div.remove()
    //   }
    // })
    // }
  }
  return Layout
})
