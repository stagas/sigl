export const shadow = (host: HTMLElement, init: ShadowRootInit | string = '', html = '') => {
  const root = host.attachShadow(typeof init === 'object' ? init : { mode: 'open' })
  root.innerHTML = typeof init === 'string' ? init : html
  return root
}
