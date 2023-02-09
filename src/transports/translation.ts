import { Message } from '../messages/message'

export type Translator = (message: any) => Message

export const defaultTranslation: Translator = (message: any): Message => {
  return message as Message
}
