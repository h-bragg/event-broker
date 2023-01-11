import { chunkByBytes } from './chunk'

describe('chunkByBytes', () => {
  it('should return a single item', () => {
    const items = [{ value: 1, bytes: 10 }]
    const chunked = chunkByBytes(items, 10, 0)
    expect(chunked).toHaveLength(1)
    expect(chunked[0]).toEqual(items)
  })

  it('should chunk by maximum number', () => {
    const items = [
      { value: 1, bytes: 10 },
      { value: 2, bytes: 10 },
      { value: 3, bytes: 10 },
      { value: 4, bytes: 10 },
    ]
    const chunked = chunkByBytes(items, 10000, 0, 2)
    expect(chunked).toHaveLength(2)
    expect(chunked[0]).toEqual(items.slice(0, 2))
    expect(chunked[1]).toEqual(items.slice(2, 4))
  })

  it('should chunk by maximum size', () => {
    const items = [
      { value: 1, bytes: 10 },
      { value: 2, bytes: 20 },
      { value: 3, bytes: 30 },
      { value: 4, bytes: 40 },
    ]
    const chunked = chunkByBytes(items, 60, 0, 5)
    expect(chunked).toHaveLength(2)
    expect(chunked[0]).toEqual(items.slice(0, 3))
    expect(chunked[1]).toEqual(items.slice(3, 4))
  })

  it('should chunk by maximum size with the base modifier', () => {
    const items = [
      { value: 1, bytes: 10 },
      { value: 2, bytes: 20 },
      { value: 3, bytes: 30 },
      { value: 4, bytes: 40 },
    ]
    const chunked = chunkByBytes(items, 62, 1, 5)
    expect(chunked).toHaveLength(3)
    expect(chunked[0]).toEqual(items.slice(0, 2))
    expect(chunked[1]).toEqual(items.slice(2, 3))
    expect(chunked[2]).toEqual(items.slice(3, 4))
  })

  it('should chunk by maximum size and number', () => {
    const items = [
      { value: 1, bytes: 10 },
      { value: 2, bytes: 20 },
      { value: 3, bytes: 30 },
      { value: 4, bytes: 40 },
      { value: 5, bytes: 70 },
      { value: 6, bytes: 90 },
      { value: 7, bytes: 120 },
    ]
    const chunked = chunkByBytes(items, 120, 0, 3)
    expect(chunked).toHaveLength(4)
    expect(chunked[0]).toEqual(items.slice(0, 3))
    expect(chunked[1]).toEqual(items.slice(3, 5))
    expect(chunked[2]).toEqual(items.slice(5, 6))
    expect(chunked[3]).toEqual(items.slice(6, 7))
  })

  it('should error if a single entry is bigger than the maximum size', () => {
    const items = [{ value: 1, bytes: 121 }]
    expect(() => chunkByBytes(items, 120, 0, 1)).toThrowError(
      /^.+bigger than max bytes.+/
    )
  })
})
