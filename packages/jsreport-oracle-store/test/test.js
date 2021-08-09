require('should')
process.env.DEBUG = 'jsreport'
const jsreport = require('@jsreport/jsreport-core')

const USE_DOCKER_CONNECTION = process.env.USE_DOCKER_CONNECTION !== 'false'

describe('common store tests', () => {
  let reporter

  async function createReporter () {
    const localOpts = {
      user: 'jsreport',
      password: 'jsreport',
      connectionString: 'localhost:1521/XEPDB1',
      poolMin: 0,
      poolMax: 20,
      poolIncrement: 1
    }

    // we can start the container with:
    // docker run -p 1521:1521 -e ORACLE_PWD=oracle -v ${PWD}/oracle-setup:/docker-entrypoint-initdb.d/startup pvargacl/oracle-xe-18.4.0:latest
    const dockerOpts = {
      user: 'jsreport',
      password: 'jsreport',
      connectionString: 'localhost:1521/XEPDB1',
      poolMin: 0,
      poolMax: 20,
      poolIncrement: 1
    }

    const extOpts = USE_DOCKER_CONNECTION ? dockerOpts : localOpts

    const instance = jsreport({
      store: { provider: 'oracle' }
    }).use(
      require('../')(extOpts)
    ).use(() => {
      jsreport.tests.documentStore().init(() => instance.documentStore)
    })

    await instance.init()

    return instance
  }

  before(async () => {
    reporter = await createReporter()
    await reporter.documentStore.drop()
    await reporter.close()
  })

  beforeEach(async () => {
    reporter = await createReporter()
    await jsreport.tests.documentStore().clean(() => reporter.documentStore)
  })

  afterEach(() => reporter.close())

  jsreport.tests.documentStore()(() => reporter.documentStore)
})
