export const dataset = <T extends Record<string, any>>(target: HTMLElement, data: T) => {
  for (const key in data)
    target.dataset[key] = data[key].toString()
}
