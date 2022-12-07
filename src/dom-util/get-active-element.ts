export const getActiveElement = (el: Element | null = document.activeElement): Element | null => {
  if (el?.shadowRoot)
    return getActiveElement(el.shadowRoot.activeElement) ?? el
  return el
}
