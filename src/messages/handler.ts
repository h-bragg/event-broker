import { Receiver } from '../transports/transport'
import { Message } from './message'

export type Handler<T extends Message> = {
  handle(event: T): Promise<void>
  canHandle(event: T): boolean
}

export const on = <T extends Message>(
  name: string,
  version: string,
  handle: (event: T) => Promise<void>
): Handler<T> => ({
  handle,
  canHandle: (event: T) => event.$name === name && event.$version === version,
})

export const handlerFor = (
  handle: (event: Message) => Promise<void>
): Handler<Message> => ({ handle, canHandle: () => true })

export const deleteHandler = (
  handlers: Handler<Message>[],
  handler: Handler<Message>
): Handler<Message>[] => {
  const index = handlers.findIndex((v) => v === handler)
  if (index >= 0) delete handlers[index]
  return handlers
}

export const handlerSetAsReceiver = (
  handlers: Set<Handler<Message>>
): Receiver => ({
  handle: async (handler: Handler<Message>) => {
    handlers.add(handler)
  },
  removeHandler: async (handler: Handler<Message>) => {
    handlers.delete(handler)
  },
})
