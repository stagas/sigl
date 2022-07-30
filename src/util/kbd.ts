export type KbdShortcuts = readonly [string[], (e: KeyboardEvent) => any][]

export const kbd = (...shortcuts: KbdShortcuts) =>
  (e: KeyboardEvent) => {
    const pressed = [
      e.shiftKey && 'shift',
      e.altKey && 'alt',
      e.ctrlKey && 'ctrl',
      e.metaKey && 'meta',
      (e.ctrlKey || e.metaKey) && 'cmd',
      e.key.replace('Arrow', '').toLowerCase(),
    ].filter(Boolean) as string[]

    for (const [shortcut, cmd] of shortcuts) {
      if (shortcut.every(x => pressed.includes(x.toLowerCase()))) {
        e.preventDefault()
        e.stopPropagation()
        return cmd(e)
      }
    }
  }
