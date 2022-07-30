export const observe = {
  resize: (el: Element, fn: ResizeObserverCallback) => {
    const observer = new ResizeObserver(fn)
    observer.observe(el)
    return () => observer.disconnect()
  },
  gc: <T>(item: object, value: T, fn: (heldValue: T) => void) => {
    const reg = new FinalizationRegistry(fn)
    reg.register(item, value)
    return reg
  },
}
