export function getObservedRect(el: Element) {
  return new Promise<DOMRectReadOnly>(resolve => {
    const observer = new IntersectionObserver(([entry]) => {
      const bounds = entry.boundingClientRect
      observer.disconnect()
      resolve(bounds)
    })
    observer.observe(el)
  })
}
