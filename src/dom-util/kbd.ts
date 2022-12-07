export type KbdShortcuts = (readonly [string[], (e: KeyboardEvent) => any])[]

export const kbd = (...shortcuts: KbdShortcuts) =>
  (e: KeyboardEvent) => {
    const localeKey = e.key.replace('Arrow', '').toLowerCase()
    const physicalKey = String.fromCharCode(e.which).toLowerCase()

    const pressed = [
      e.shiftKey && 'shift',
      e.altKey && 'alt',
      e.ctrlKey && 'ctrl',
      e.metaKey && 'meta',
      (e.ctrlKey || e.metaKey) && 'cmd',
    ].filter(Boolean) as string[]

    // if (pressed.length) {
    //   e.preventDefault()
    //   e.stopPropagation()
    // }

    const shortcutsLower = shortcuts.map(([shortcut, cmd]) =>
      [shortcut.map((x) => x.toLowerCase()), cmd] as const
    )

    const pressedLocale = [...pressed, localeKey]
    const pressedPhysical = [...pressed, physicalKey]

    const candidates = [pressedLocale, pressedPhysical]

    for (const [shortcut, cmd] of shortcutsLower) {
      for (const candidate of candidates) {
        if (shortcut.every((x) => candidate.includes(x))
          && candidate.every((x) => shortcut.includes(x))) {
          e.preventDefault()
          e.stopPropagation()
          return cmd(e)
        }
      }
    }
  }
