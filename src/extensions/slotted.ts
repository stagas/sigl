import { filterMap } from 'everyday-utils'
import { bool, toFluent } from 'to-fluent'
import $ from '..'

export class SlottedSettings {
  elements = bool
  nodes = bool
  firstChild = bool
  deep = bool
}

export const slotted = (c: { _scheduleProperty(key: string, ...args: any[]): symbol }) =>
  toFluent(
    SlottedSettings,
    settings =>
      (mapFn = (x: any) => x) =>
        c._scheduleProperty('fulfill', ({ root }: any) =>
          (cb: any) =>
            $.onSlotChange(root, slotted => {
              let result

              if (settings.nodes) result = slotted.nodes
              else if (settings.firstChild) result = [slotted.firstChild]
              else result = slotted.elements

              if (settings.deep) {
                result = result.flatMap((x: any) => x instanceof HTMLSlotElement ? [...x.assignedElements()] : x)
              }

              result = filterMap(result, mapFn)

              if (!result.length) cb(void 0)
              else if (settings.firstChild) cb(result[0])
              else cb(result)
            }))
  )
