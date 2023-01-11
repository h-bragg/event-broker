import { Handler } from '../messages/handler'
import { Message } from '../messages/message'

export type Publisher = {
  publish(...messages: Message[]): Promise<void>
}

export type Receiver = {
  handle(handler: Handler<Message>): Promise<void>
  removeHandler(handler: Handler<Message>): Promise<void>
}

export type Transport = Publisher & Receiver
