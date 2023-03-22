const BusyQueue = require('../lib/busyQueue.js')
const reporter = require('@jsreport/jsreport-core')()

require('should')

describe('busy queue', () => {
  let busyQueue

  beforeEach(() => {
    busyQueue = BusyQueue({
      logger: reporter.logger,
      waitingTimeout: 50,
      run: () => Promise.resolve()
    })
  })

  it('flush should call first item', (done) => {
    busyQueue.push(1, () => done(), () => {})
    busyQueue.push(1, () => {}, () => {})
    busyQueue.flush()
  })

  it('multiple flush should clear queue', (done) => {
    busyQueue.push(1, () => {}, (e) => { throw e })
    busyQueue.push(1, () => {
      busyQueue.length.should.be.eql(0)
      done()
    }, (e) => { throw e })
    busyQueue.flush()
    busyQueue.flush()
  })

  it('flush on empty should not fail', async () => {
    await busyQueue.flush()
  })

  it('processing timed out item should reject', (done) => {
    busyQueue.push(1, () => done(new Error('should have failed')), () => {
      busyQueue.length.should.be.eql(0)
      done()
    })

    setTimeout(() => busyQueue.flush(), 100)
  })
})
