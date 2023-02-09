import { Message } from '../messages/message'
import { Managed } from '../transports/managed'
import {
  deleteHandler,
  Handler,
  handlerFor,
  handlerSetAsReceiver,
} from '../messages/handler'
import { Middleware, middlewareChain } from '../messages/middleware'
import { createMemoryTransport } from '../transports/memory/memory-bus'
import { Publisher, Receiver, Transport } from '../transports/transport'

export type BrokerConf = {
  publisher?: Publisher
  receiver?: Receiver
  managed: Managed[]
  middleware: Middleware[]
}

export type BrokerConfFunc = (broker: BrokerConf) => BrokerConf

export type Broker = Transport & Managed

export enum BrokerErrors {
  NoSenderTransportConfigured = 'broker: no sender transport configured',
  NoReceiverTransportConfigured = 'broker: no receiver transport configured',
}

// createBroker instance of a Broker
//
// this takes in a set of configuration functions that define the broker:
//
// examples:
//
//     createBroker(withSqsTransport(sqsTransport))
//     createBroker(withSnsSender(snsSender), withSqsReceiver(sqsTransport))
//     createBroker(withMemoryTransport())
//     createBroker(withManyPublishers(sqsTransport, snsSender), withManyReceiver(sqsTransport1, sqsTransport2))
//     createBroker(withMemoryTransport(), withMiddleware())
export const createBroker = (...confFuncs: BrokerConfFunc[]): Broker => {
  let started = false
  const handlers: Set<Handler<Message>> = new Set()

  const conf = confFuncs.reduce((prev: BrokerConf, curr: BrokerConfFunc) => {
    return curr(prev)
  }, {} as BrokerConf)

  if (!conf.publisher && !conf.receiver) {
    conf.receiver = conf.publisher = createMemoryTransport()
  }

  if (!conf.publisher) throw new Error(BrokerErrors.NoSenderTransportConfigured)
  if (!conf.receiver)
    throw new Error(BrokerErrors.NoReceiverTransportConfigured)

  const receiver = conf.receiver!
  const publisher = conf.publisher!
  const managed = conf.managed
  const middleware = conf.middleware

  const receiverHandler = handlerFor(
    async (message: Message): Promise<void> => {
      await Promise.all(
        Array.from(handlers).map(async (handler) => {
          if (handler.canHandle(message)) {
            await middlewareChain(handler, ...middleware).handle(message)
          }
        })
      )
    }
  )

  const start = async (): Promise<void> => {
    await receiver.handle(receiverHandler)
    await Promise.all(managed.map(async (m) => await m.start()))
    started = true
  }

  const stop = async (): Promise<void> => {
    await Promise.all(managed.map(async (m) => await m.stop()))
    await receiver.removeHandler(receiverHandler)
    started = false
  }

  const publish = async (...messages: Message[]): Promise<void> =>
    publisher.publish(...messages)

  return {
    start,
    stop,
    publish,
    ...handlerSetAsReceiver(handlers),
  }
}
