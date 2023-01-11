export type Sized = {
  bytes: number
}

export const chunkByBytes = <T extends Sized>(
  input: T[],
  maxBytes: number,
  baseBytesPerEntry: number = 0,
  maxNumberPerChunk?: number
): T[][] => {
  let curr = 0
  let currBytes = 0

  return input.reduce((all: T[][], one: T): T[][] => {
    const sizeAndBase = one.bytes + baseBytesPerEntry
    if (
      currBytes + sizeAndBase <= maxBytes &&
      (maxNumberPerChunk == undefined ||
        (all[curr] || []).length < maxNumberPerChunk)
    ) {
      currBytes += sizeAndBase
    } else {
      if (currBytes === 0)
        throw new Error(
          `Unable to chunk by bytes, single entry: ${one.bytes} + base: ${baseBytesPerEntry} is bigger than max bytes: ${maxBytes}`
        )
      curr += 1
      currBytes = sizeAndBase
    }
    all[curr] = ([] as T[]).concat(all[curr] || [], one)
    return all
  }, [])
}
