import { chain, MouseButton, on } from 'event-toolkit'

export const ondblclick = (el: HTMLElement | SVGElement | Window, cb: () => void, ms = 250) => {
  let prevTimestamp = 0
  const pointers = new Set<number>()
  const clear = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
  }
  return chain(
    on(el).pointerdown(e => {
      if (!(e.buttons & MouseButton.Left)) return

      pointers.add(e.pointerId)
      if (pointers.size > 1) return

      if (e.timeStamp - prevTimestamp < ms) {
        e.stopPropagation()
        cb()
        return
      }
      prevTimestamp = e.timeStamp
    }),
    on(window).pointerup(clear),
    on(window).pointercancel(clear)
  )
}
