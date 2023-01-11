import { handlerFor, on } from './handler'
import { Event, Message } from './message'

class TestEvent implements Event {
  $name = 'test/test'
  $version = '2022-01-02'
}

class OtherEvent implements Event {
  $name = 'test/other'
  $version = '2022-01-03'
}

describe('canHandle', () => {
  it('should return true for the correct type', () => {
    const handler = on('test/test', '2022-01-02', async (_: TestEvent) => {
      return
    })

    const event = new TestEvent()

    expect(handler.canHandle(event)).toBe(true)
  })

  it('should return true for any handlers', () => {
    const genericHandler = handlerFor(async (_: Message) => {
      return
    })

    const event = new TestEvent()

    expect(genericHandler.canHandle(event)).toBe(true)
  })

  it('should return false for a different handler', () => {
    const otherHandler = on(
      'test/other',
      '2022-01-03',
      async (_: OtherEvent) => {
        return
      }
    )

    const event = new TestEvent()
    const otherEvent = new OtherEvent()

    expect(otherHandler.canHandle(event)).toBe(false)
    expect(otherHandler.canHandle(otherEvent)).toBe(true)
  })

  it('should check the version', () => {
    const diffVersionHandler = on('test/test', 'nope', async (_: TestEvent) => {
      return
    })

    const event = new TestEvent()
    expect(diffVersionHandler.canHandle(event)).toBe(false)
  })
})
