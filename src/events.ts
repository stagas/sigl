import { EventHandler, Fn, Get, Keys, Narrow, Prefix, StringOf } from 'everyday-types'

import type { Dispatch, Off, On } from 'event-toolkit'

export interface EventMethods<T, P extends Record<string, Event>> {
  dispatch: Dispatch<
    <K extends Keys<P>, E extends Narrow<P[K], CustomEvent>['detail']>(
      name: StringOf<K> | Event,
      detail?: E,
      init?: CustomEventInit,
    ) => any
  >

  on<K extends Keys<P>>(
    name: K,
  ): On<Fn<[EventHandler<T, P[K]>], Off>>
}

export type Events<T, P extends Record<string, Event>> =
  & EventMethods<T, P>
  & InlineEventMap<T, P>

export type InlineEventMap<T, P> = {
  [K in Keys<P> as Prefix<'on', K>]: EventHandler<
    T,
    Narrow<Get<P, StringOf<K>>, Event>
  >
}
