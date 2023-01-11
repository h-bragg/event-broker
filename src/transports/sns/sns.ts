import {
  SNSClient,
  PublishBatchCommand,
  MessageAttributeValue,
} from '@aws-sdk/client-sns'
import { Message } from '../../messages/message'
import * as crypto from 'crypto'
import { awsChunk } from '../../chunk/aws-chunk'
import { Publisher } from '../transport'

export type SNSPublisherProps = {
  client: SNSClient
  topicArn: string
}

export type SNSPublisher = Publisher

export enum SNSPublisherErrors {
  UnknownBus = 'event bus could not be found',
}

export const createSNSPublisher = async ({
  client,
  topicArn,
}: SNSPublisherProps): Promise<SNSPublisher> => {
  const publish = async (...messages: Message[]): Promise<void> => {
    const entries = messages.map((message) => ({
      Id: crypto.randomUUID(),
      Message: JSON.stringify(message),
      MessageAttributes: {
        name: stringAttr(message.$name),
        verison: stringAttr(message.$version),
      },
    }))

    const chunks = awsChunk(entries)
    await Promise.all(
      chunks.map(async (chunk) => {
        const command = new PublishBatchCommand({
          TopicArn: topicArn,
          PublishBatchRequestEntries: chunk.map(({ data }) => data),
        })
        await client.send(command)
      })
    )
  }

  return {
    publish,
  }
}

const stringAttr = (val: string): MessageAttributeValue => ({
  StringValue: val,
  DataType: 'String',
})
