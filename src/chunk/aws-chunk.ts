import { chunkByBytes, Sized } from './chunk'

const MAX_AWS_MESSAGE_BYTES = 240 * 1000 // actually 256KiB / 262,144 but shortening to give some leeway

export type DataSized<T extends object> = {
  data: T
} & Sized

export const awsChunk = <T extends object>(
  input: T[],
  baseBytesPerEntry: number = 0
): DataSized<T>[][] => {
  const sized = input.map((data) => {
    const json = JSON.stringify(data)
    return { data, bytes: Buffer.byteLength(json) } as DataSized<T>
  })
  return chunkByBytes(sized, MAX_AWS_MESSAGE_BYTES, baseBytesPerEntry, 10)
}
