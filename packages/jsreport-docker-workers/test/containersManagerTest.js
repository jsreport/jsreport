const createContainersManager = require('../lib/containersManager')
const reporter = require('@jsreport/jsreport-core')()

describe('containers manager', () => {
  let containersManager

  beforeEach(async () => {
    containersManager = createContainersManager({
      container: {
        warmupPolicy: true
      },
      containerParallelRequestsLimit: 50,
      customContainersPoolFactory: () => ({
        containers: [{ id: 'a', restart: () => {} }, { id: 'b', restart: () => {} }],
        start: () => {},
        remove: () => {}
      }),
      logger: reporter.logger
    })

    return containersManager.start()
  })

  afterEach(() => containersManager && containersManager.close())

  it('allocate should get unsused container and set lastUsed, tenant and inc numberOfRequests', async () => {
    const container = await containersManager.allocate({
      tenant: 'a'
    })

    container.lastUsed.should.be.ok()
    container.numberOfRequests.should.be.eql(1)
    container.tenant = 'a'
  })

  it('allocate should reuse assigned container and increase number of requests', async () => {
    containersManager.containersPool.containers[0].tenant = 'a'
    containersManager.containersPool.containers[0].numberOfRequests = 1
    const container = await containersManager.allocate({
      tenant: 'a'
    })

    container.numberOfRequests.should.be.eql(2)
  })

  it('allocate should find container LRU and restart', async () => {
    containersManager.containersPool.containers[0].lastUsed = new Date()
    containersManager.containersPool.containers[0].tenant = 'a'
    containersManager.containersPool.containers[1].lastUsed = new Date(new Date().getTime() - 1000)
    containersManager.containersPool.containers[1].tenant = 'b'

    let recycled = false
    containersManager.onRecycle(() => (recycled = true))

    const container = await containersManager.allocate({
      tenant: 'c'
    })

    container.should.be.eql(containersManager.containersPool.containers[1])
    container.numberOfRestarts.should.be.eql(1)
    recycled.should.be.true()
  })

  it('allocate should queue if all containers are busy', (done) => {
    containersManager.containersPool.containers[0].tenant = 'a'
    containersManager.containersPool.containers[0].numberOfRequests = 1
    containersManager.containersPool.containers[1].tenant = 'b'
    containersManager.containersPool.containers[1].numberOfRequests = 1
    containersManager.busyQueue.push = () => done()

    containersManager.allocate({
      tenant: 'c'
    })
  })

  it('recycle should restart container', async () => {
    const container = containersManager.containersPool.containers[0]
    container.numberOfRequests = 1
    await containersManager.recycle({ container })
    container.numberOfRestarts.should.be.eql(1)
    container.numberOfRequests.should.be.eql(0)
  })

  it('release should decrease number of requests', async () => {
    const container = containersManager.containersPool.containers[0]
    container.numberOfRequests = 1
    await containersManager.release(container)
    container.numberOfRestarts.should.be.eql(0)
    container.numberOfRequests.should.be.eql(0)
  })

  it('release should flush queue', (done) => {
    containersManager.busyQueue.flush = () => done()
    const container = containersManager.containersPool.containers[0]
    container.numberOfRequests = 1
    containersManager.release(container)
  })

  it('release should warmup last used container', (done) => {
    containersManager.containersPool.containers[1].lastUsed = new Date(Date.now() - 5000)
    containersManager.containersPool.containers[1].tenant = 'x'
    containersManager.containersPool.containers[1].restart = done
    const container = containersManager.containersPool.containers[0]
    container.lastUsed = new Date()
    container.numberOfRequests = 1
    containersManager.release(container)
  })
})
