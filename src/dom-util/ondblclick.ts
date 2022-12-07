import { chain, MouseButton, on } from 'event-toolkit'

export const ondblclick = (el: HTMLElement | SVGElement | Window, cb: (event: PointerEvent, firstPath: EventTarget[]) => any, ms = 250) => {
  let prevTimestamp = 0
  const pointers = new Set<number>()
  const clear = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
  }
  let firstDownPath: EventTarget[]
  return chain(
    on(el).pointerdown((e) => {
      if (!(e.buttons & MouseButton.Left)) return

      pointers.add(e.pointerId)
      if (pointers.size > 1) return

      if (e.timeStamp - prevTimestamp < ms) {
        e.stopPropagation()
        return cb(e, firstDownPath)
      }
      firstDownPath = e.composedPath()
      prevTimestamp = e.timeStamp
    }),
    on(window).pointerup(clear),
    on(window).pointercancel(clear)
  )
}
