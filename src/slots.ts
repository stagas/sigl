import { Off, on } from 'event-toolkit'

export const observeNodes = (
  nodes: Node[] | null,
  observer: MutationObserver,
  options: MutationObserverInit,
) => nodes?.forEach(node => observer.observe(node, options))

export const nodesToText = (nodes: Node[] | null) =>
  nodes
    ?.map(node => {
      const text = node.textContent!
      return text.trim().length ? text : ''
    })
    .join('') ?? ''

export type Slotted = { nodes: Node[]; elements: Element[]; firstChild?: Element }

export const slotted = (slots: HTMLSlotElement[], options?: AssignedNodesOptions): Slotted => ({
  get nodes() {
    return slots.map(slot => slot.assignedNodes(options)).flat(Infinity) as Node[]
  },
  get elements() {
    return slots.map(slot => slot.assignedElements(options)).flat(Infinity) as Element[]
  },
  get firstChild() {
    return this.elements[0]
  },
})

export const onSlotChange = <T extends ShadowRoot | HTMLSlotElement>(
  el: T,
  cb: (slotted: Slotted) => void,
  fn: (el: T) => HTMLSlotElement[] = el => el instanceof HTMLSlotElement ? [el] : [...el.querySelectorAll('slot')],
  options?: AssignedNodesOptions,
) => on(el, 'slotchange' as any)(() => cb(slotted(fn(el), options)))

export const onTextChange = <T extends ShadowRoot | HTMLSlotElement>(
  el: T,
  cb: (text: string) => void,
  fn?: (el: T) => HTMLSlotElement[],
): Off => {
  let observer: MutationObserver

  const off = onSlotChange(el, ({ nodes }) => {
    observer?.disconnect()
    if (nodes.length) {
      observer = new MutationObserver(() => cb(nodesToText(nodes)))
      observeNodes(nodes, observer, { characterData: true })
      cb(nodesToText(nodes))
    }
  }, fn)

  return () => {
    observer?.disconnect()
    return off()
  }
}
