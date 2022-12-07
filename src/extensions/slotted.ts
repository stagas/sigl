import { filterMap } from 'everyday-utils'
import { bool, toFluent } from 'to-fluent'
import $ from '..'

export class SlottedSettings {
  deep = bool
  elements = bool
  firstChild = bool
  flatten = bool
  nodes = bool
}

export const slotted = (c: { _scheduleProperty(key: string, ...args: any[]): symbol }) =>
  toFluent(
    SlottedSettings,
    settings =>
      (mapFn = (x: any) => x) =>
        c._scheduleProperty('fulfill', ({ root }: any) =>
          (cb: any) =>
            $.onSlotChange(
              root,
              slotted => {
                let result

                if (settings.nodes) result = slotted.nodes
                else if (settings.firstChild) result = [slotted.firstChild]
                else result = slotted.elements

                if (settings.deep) {
                  if (settings.nodes) {
                    result = result.flatMap((x: any) =>
                      x instanceof HTMLSlotElement
                        ? [...x.assignedNodes({
                          flatten: settings.flatten,
                        })]
                        : x
                    )
                  } else {
                    result = result.flatMap((x: any) =>
                      x instanceof HTMLSlotElement
                        ? [...x.assignedElements({
                          flatten: settings.flatten,
                        })]
                        : x
                    )
                  }
                }

                result = filterMap(result, mapFn)

                if (!result.length) cb([])
                else if (settings.firstChild) cb(result[0])
                else cb(result)
              },
              void 0,
              { flatten: settings.flatten }
            ))
  )
