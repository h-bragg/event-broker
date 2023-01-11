import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge'
import { awsChunk } from '../../chunk/aws-chunk'
import { Message } from '../../messages/message'
import { Publisher } from '../transport'

export type EventBridgePublisherProps = {
  client: EventBridgeClient
  source: string
  busName: string
}

export type EventBridgePublisher = Publisher

export enum EventBridgeAdapterErrors {
  UnknownBus = 'event bus could not be found',
}

export const createEventBridgePublisher = async ({
  client,
  source,
  busName,
}: EventBridgePublisherProps): Promise<EventBridgePublisher> => {
  const publish = async (...messages: Message[]): Promise<void> => {
    const entries = messages.map((message) => ({
      Detail: JSON.stringify(message),
      DetailType: `${message.$name}/${message.$version}`,
      Source: source,
      EventBusName: busName,
    }))

    const chunks = awsChunk(entries)
    await Promise.all(
      chunks.map(async (chunk) => {
        const command = new PutEventsCommand({
          Entries: chunk.map(({ data }) => data),
        })
        await client.send(command)
      })
    )
  }

  return {
    publish,
  }
}
