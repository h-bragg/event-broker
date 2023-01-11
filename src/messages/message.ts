export interface Message {
  readonly $name: string
  readonly $version: string
}

export type Event = Message
export type Command = Message
