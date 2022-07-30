export const findParentElement = <T extends HTMLElement>(
  child: HTMLElement,
  fn: (parent: HTMLElement) => boolean,
): T | void => {
  let el: HTMLElement | null = child
  while (el = el.parentElement)
    if (fn(el)) return el as T
}
