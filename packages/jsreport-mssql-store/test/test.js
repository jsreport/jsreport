require('should')
process.env.DEBUG = 'jsreport'
const jsreport = require('@jsreport/jsreport-core')

const USE_DOCKER_CONNECTION = process.env.USE_DOCKER_CONNECTION !== 'false'

describe('common store tests', () => {
  let reporter

  async function createReporter () {
    // NOTE: make sure the db created has READ_COMMITTED_SNAPSHOT enabled,
    // this prevents transactions to use locks, which prevents reads to be executed
    // when the transaction is not finished (with commit or rollback).
    // to enable this we need to run:
    // ALTER DATABASE jsreport SET READ_COMMITTED_SNAPSHOT ON;
    //
    // if you see that test hangs then you know
    // that you forgot to enable READ_COMMITTED_SNAPSHOT :)

    const localOpts = {
      user: 'jsreport',
      password: 'password',
      server: 'localhost',
      database: 'jsreport',
      options: {
        trustServerCertificate: true
      }
    }

    // we can start the container with:
    // docker run -d --name sql_server -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=reallyStrongPwd123' -p 1433:1433 mcr.microsoft.com/mssql/server:2019-GA-ubuntu-16.04
    // and for the first time, connect to the container with docker exec -it 32e4109ef651 /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P reallyStrongPwd123
    // and create the database in the REPL console with > CREATE DATABASE jsreport; and in other line > GO
    const dockerOpts = {
      user: 'sa',
      password: 'reallyStrongPwd123',
      server: 'localhost',
      database: 'jsreport',
      options: {
        trustServerCertificate: true
      }
    }

    const extOpts = USE_DOCKER_CONNECTION ? dockerOpts : localOpts

    const instance = jsreport({
      store: { provider: 'mssql' }
    }).use(
      require('../')(extOpts)
    ).use(() => {
      jsreport.tests.documentStore().init(() => instance.documentStore)
    })

    await instance.init()

    return instance
  }

  beforeEach(async () => {
    reporter = await createReporter()
    await reporter.blobStorage.drop()
    await reporter.documentStore.drop()
    await reporter.close()

    reporter = await createReporter()
    await jsreport.tests.documentStore().clean(() => reporter.documentStore)
  })

  afterEach(() => reporter && reporter.close())

  jsreport.tests.documentStore()(() => reporter.documentStore)
  jsreport.tests.blobStorage()(() => reporter.blobStorage)

  it('should persist blobs', async () => {
    await reporter.blobStorage.write('myblob.txt', Buffer.from('hello'))
    const blob = await reporter.blobStorage.read('myblob.txt')
    blob.toString().should.be.eql('hello')

    const res = await reporter.documentStore.provider.pool.request().query('SELECT blobName, content from jsreport_Blob')
    res.recordset.should.have.length(1)
  })
})
