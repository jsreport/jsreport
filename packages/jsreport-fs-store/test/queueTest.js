const Queue = require('../lib/queue')
require('should')

describe('queue', () => {
  let queue

  beforeEach(() => (queue = Queue(50)))

  it('should process one item', async () => {
    let processed = false
    await queue.push(() => (processed = true))
    processed.should.be.true()
  })

  it('should process multiple items step by step', async () => {
    let r1
    let r2
    let r2Running = false

    const p1 = queue.push(() => (new Promise((resolve) => {
      r1 = resolve
    })))

    const p2 = queue.push(() => (new Promise((resolve) => {
      r2Running = true
      r2 = resolve
    })))

    r2Running.should.be.false()
    r1()
    await p1
    r2()
    await p2
    r2Running.should.be.true()
  })

  it('rejectItemsWithTimeout should reject old items', async () => {
    // block queue with something
    let resolveBlockingPromise
    const blockingPromise = new Promise((resolve) => (resolveBlockingPromise = resolve))
    queue.push(() => blockingPromise)
    // this will wait longer than timeout 10ms
    const promise = queue.push(() => {})
    await new Promise((resolve) => setTimeout(resolve, 60))
    queue.rejectItemsWithTimeout()
    await promise.should.be.rejectedWith(/Timeout during waiting/)
    resolveBlockingPromise()
  })
})
