import { Rect } from 'geometrik'

export function getViewportRect() {
  return new Rect(
    document.scrollingElement!.scrollLeft,
    document.scrollingElement!.scrollTop,
    window.visualViewport!.width,
    window.visualViewport!.height
  )
}
