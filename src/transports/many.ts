import { BrokerConf, BrokerConfFunc } from '../broker/broker'
import { Handler } from '../messages/handler'
import { Message } from '../messages/message'
import { Publisher, Receiver } from './transport'

const manyPublishers = (...publishers: Publisher[]): Publisher => ({
  publish: async (...messages: Message[]): Promise<void> => {
    await Promise.all(
      publishers.map(async (publisher) => publisher.publish(...messages))
    )
  },
})

export const withManyPublishers =
  (...publishers: Publisher[]): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf => ({
    ...conf,
    publisher: manyPublishers(...publishers),
  })

const manyReceivers = (...receivers: Receiver[]): Receiver => ({
  handle: async (handler: Handler<any>): Promise<void> => {
    await Promise.all(
      receivers.map(async (receiver) => receiver.handle(handler))
    )
  },
  removeHandler: async (handler: Handler<any>): Promise<void> => {
    await Promise.all(
      receivers.map(async (receiver) => receiver.removeHandler(handler))
    )
  },
})

export const withManyReceivers =
  (...receivers: Receiver[]): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf => ({
    ...conf,
    receiver: manyReceivers(...receivers),
  })
