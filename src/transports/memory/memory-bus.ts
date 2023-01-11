import { BrokerConf, BrokerConfFunc } from '../../broker/broker'
import { deleteHandler, Handler } from '../../messages/handler'
import { Message } from '../../messages/message'
import { Transport } from '../transport'

export type MemoryTransport = Transport

export const createMemoryTransport = (): MemoryTransport => {
  let handlers: Handler<Message>[]

  const handle = async (handler: Handler<Message>): Promise<void> => {
    handlers = [...handlers, handler]
  }

  const removeHandler = async (handler: Handler<Message>): Promise<void> => {
    deleteHandler(handlers, handler)
  }

  const sendOne = async (message: Message): Promise<void> => {
    setTimeout(async () => {
      await Promise.all(
        handlers.map(async (handler) => {
          await handler.handle(message)
        })
      )
    }, 0)
  }

  const publish = async (...messages: Message[]): Promise<void> => {
    await Promise.all(
      messages.map(async (message) => {
        await sendOne(message)
      })
    )
  }

  return {
    publish,
    handle,
    removeHandler,
  }
}

export const withMemoryTransport =
  (adapter: MemoryTransport): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf => ({
    ...conf,
    publisher: adapter,
    receiver: adapter,
  })
