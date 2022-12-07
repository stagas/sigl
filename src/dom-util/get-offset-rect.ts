import $ from '..'

export function getOffsetRect(el: HTMLElement, depth = Infinity) {
  const offset = $.getElementOffset(el, depth)
  const rect = new $.Rect(offset.x, offset.y, el.offsetWidth, el.offsetHeight)
  return rect
}
