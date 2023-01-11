import { BrokerConf, BrokerConfFunc } from '../broker/broker'
import { Handler } from './handler'
import { Message } from './message'

export type Middleware = (next: Handler<Message>) => Handler<Message>

export const withMiddleware =
  (...middleware: Middleware[]): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf => ({
    ...conf,
    middleware: [...conf.middleware, ...middleware],
  })

export const middlewareChain = (
  final: Handler<Message>,
  ...middleware: Middleware[]
): Handler<Message> =>
  middleware.reduceRight((next, current) => current(next), final)
