const createContainersPool = require('../../lib/docker/containersPool')
const reporter = require('@jsreport/jsreport-core')()
const axios = require('axios')
const os = require('os')
const path = require('path')
require('should')

describe('containers pool', () => {
  let containersPool

  beforeEach(() => {
    containersPool = createContainersPool({
      logger: reporter.logger,
      network: 'nw_jsreport_docker_workers',
      subnet: '172.30.0.0/24',
      numberOfWorkers: 3,
      hostIp: 'localhost',
      tempDirectory: path.join(os.tmpdir(), 'jsreport'),
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

  afterEach(() => containersPool.remove())

  it('should create specific number of reachable containers', async () => {
    await containersPool.createNetworkForContainers()
    await containersPool.start()

    containersPool.containers.should.have.length(3)
    return Promise.all(containersPool.containers.map((c) => axios.get(c.url)))
  })
})
