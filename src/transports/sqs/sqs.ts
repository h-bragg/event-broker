import {
  ChangeMessageVisibilityCommand,
  GetQueueUrlCommand,
  MessageAttributeValue,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  Message as SqsMessage,
  SQSClient,
  ChangeMessageVisibilityBatchCommand,
  DeleteMessageBatchCommand,
} from '@aws-sdk/client-sqs'
import { Message } from '../../messages/message'
import { Managed } from '../managed'
import * as crypto from 'crypto'
import { BrokerConf, BrokerConfFunc } from '../../broker/broker'
import { Handler } from '../../messages/handler'
import { awsChunk } from '../../chunk/aws-chunk'
import { Transport } from '../transport'

export type Translator = (message: SqsMessage) => Message

export type SQSTransportProps = {
  client: SQSClient
  queue: string
  translate?: Translator
  pollFrequencyMs?: number
}

export type SQSTransport = Transport & Managed

export enum SQSAdapterErrors {
  UnknownQueue = 'queue could not be found',
}

export const defaultTranslation: Translator = (message: SqsMessage): Message =>
  JSON.parse(message.Body || '{}') as Message

export const createSQSTransport = ({
  client,
  queue,
  translate = defaultTranslation,
  pollFrequencyMs = 100,
}: SQSTransportProps): SQSTransport => {
  const handlers: Set<Handler<Message>> = new Set()
  let pollRef: NodeJS.Timeout | undefined
  let started: boolean = false
  let QueueUrl: string

  const sendOne = async (message: Message): Promise<void> => {
    const command = new SendMessageCommand({
      QueueUrl,
      MessageBody: JSON.stringify(message),
    })
    await client.send(command)
  }

  const publish = async (...messages: Message[]): Promise<void> => {
    if (messages.length === 1) return sendOne(messages[0])

    const entries = messages.map((message) => ({
      Id: crypto.randomUUID(),
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        name: stringAttr(message.$name),
        version: stringAttr(message.$version),
      },
    }))

    const chunks = awsChunk(entries)
    await Promise.all(
      chunks.map(async (messageBatch) => {
        const command = new SendMessageBatchCommand({
          QueueUrl,
          Entries: messageBatch.map(({ data }) => data),
        })
        await client.send(command)
      })
    )
  }

  const handle = async (handler: Handler<Message>): Promise<void> => {
    handlers.add(handler)

    if (pollRef === undefined && started) {
      startPoll()
    }
  }

  const removeHandler = async (handler: Handler<Message>): Promise<void> => {
    handlers.delete(handler)
    if (handlers.size === 0 && pollRef) stopPoll()
  }

  const startPoll = () => {
    pollRef = setTimeout(
      () =>
        (async () => {
          pollRef = undefined
          await doPoll()
          startPoll()
        })(),
      pollFrequencyMs
    )
  }

  const stopPoll = () => {
    if (pollRef) {
      clearTimeout(pollRef)
      pollRef = undefined
    }
  }

  const start = async (): Promise<void> => {
    const queueUrl = (
      await client.send(new GetQueueUrlCommand({ QueueName: queue }))
    ).QueueUrl
    if (!queueUrl) throw new Error(SQSAdapterErrors.UnknownQueue)
    QueueUrl = queueUrl

    if (handlers.size > 0) {
      startPoll()
    }
    started = true
  }

  const stop = async (): Promise<void> => {
    stopPoll()
    started = false
  }

  const doPoll = async (): Promise<void> => {
    const command = new ReceiveMessageCommand({
      QueueUrl,
      WaitTimeSeconds: 5,
      MaxNumberOfMessages: 10,
      AttributeNames: ['All'],
      MessageAttributeNames: ['.*'],
    })
    const response = await client.send(command)

    if (response.Messages && response.Messages.length > 0) {
      const results = await Promise.all(
        response.Messages.map(async (sqsMessage: SqsMessage) => {
          try {
            const message = translate(sqsMessage)
            await Promise.all(
              Array.from(handlers).map(async (handler) =>
                handler.handle(message)
              )
            )
            return { success: sqsMessage.ReceiptHandle }
          } catch (err) {
            return { error: sqsMessage.ReceiptHandle }
          }
        })
      )

      const deleteSuccessful = async (handles: string[]) => {
        if (handles.length > 0) {
          const deleteCommand = new DeleteMessageBatchCommand({
            QueueUrl,
            Entries: handles.map((ReceiptHandle) => ({
              Id: crypto.randomUUID(),
              ReceiptHandle,
            })),
          })
          return client.send(deleteCommand)
        }
      }

      const requeueFailed = async (handles: string[]) => {
        if (handles.length > 0) {
          const visibilyCommand = new ChangeMessageVisibilityBatchCommand({
            QueueUrl,
            Entries: handles.map((ReceiptHandle) => ({
              Id: crypto.randomUUID(),
              ReceiptHandle,
            })),
          })
          await client.send(visibilyCommand)
        }
      }

      await Promise.all([
        deleteSuccessful(
          results.filter((r) => r.success!!).map((r) => r.success!)
        ),
        requeueFailed(results.filter((r) => r.error!!).map((r) => r.error!)),
      ])
    }
  }

  return {
    publish,
    handle,
    removeHandler,
    start,
    stop,
  }
}

const stringAttr = (val: string): MessageAttributeValue => ({
  StringValue: val,
  DataType: 'String',
})

export const withSqsSender =
  (adapter: SQSTransport): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf => ({
    ...conf,
    publisher: adapter,
  })

export const withSqsReceiver =
  (adapter: SQSTransport): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf => ({
    ...conf,
    receiver: adapter,
    managed: [...conf.managed, adapter],
  })

export const withSqsTransport =
  (adapter: SQSTransport): BrokerConfFunc =>
  (conf: BrokerConf): BrokerConf =>
    withSqsSender(adapter)(withSqsReceiver(adapter)(conf))
