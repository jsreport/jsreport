const createContainersPool = require('../../lib/docker/containersPool')
const Container = require('../../lib/docker/container')
const reporter = require('@jsreport/jsreport-core')()
const axios = require('axios')
const os = require('os')
const path = require('path')

describe('container', () => {
  let container

  beforeEach(async () => {
    const network = 'nw_jsreport_docker_workers'
    const subnet = '172.30.0.0/24'

    const containersPool = createContainersPool({
      network,
      subnet,
      logger: reporter.logger
    })

    await containersPool.createNetworkForContainers()

    container = new Container({
      port: 2000,
      startTimeout: 2000,
      logger: reporter.logger,
      id: 'jsreport_worker_1',
      tempDirectory: path.join(os.tmpdir(), 'jsreport'),
      network,
      hostIp: 'localhost',
      container: {
        image: 'mendhak/http-https-echo:18',
        namePrefix: 'jsreport_worker',
        exposedPort: 8080,
        basePublishPort: 2001,
        baseDebugPort: 9230,
        startTimeout: 10000,
        restartPolicy: true,
        warmupPolicy: true,
        debuggingSession: false,
        memorySwap: '512m',
        memory: '420m',
        cpus: '0.5',
        logDriver: 'json-file',
        tempVolumeTarget: '/tmp'
      }
    })
  })

  afterEach(() => container.remove())

  it('container should be reachable after start', async () => {
    await container.start()
    await axios.get(container.url)
  })

  it('container should be reachable after restart', async () => {
    await container.start()
    await container.restart()
    await axios.get(container.url)
  })

  it('container should be reachable after multiple start', async () => {
    await container.start()
    await container.start()
    await axios.get(container.url)
  })

  it('container should not be reachable after remove', async () => {
    await container.start()
    await container.remove()
    return axios.get(container.url).should.be.rejected()
  })
})
