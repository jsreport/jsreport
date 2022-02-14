const supertest = require('supertest')
const jsreport = require('@jsreport/jsreport-core')
const should = require('should')

describe('with reports extension', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      workers: {
        numberOfWorkers: 2
      }
    })
    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-data')())
    reporter.use(require('@jsreport/jsreport-handlebars')())
    reporter.use(require('@jsreport/jsreport-express')())
    reporter.use(require('@jsreport/jsreport-scripts')())
    reporter.use(jsreport.tests.listeners())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should store report entity and blob with save: true', async () => {
    await reporter.render({
      options: { reports: { save: true } },
      template: {
        engine: 'none',
        content: 'hello',
        name: 'name',
        recipe: 'html'
      }
    })

    const reports = await reporter.documentStore.collection('reports').find({})
    reports.should.have.length(1)

    const blob = await reporter.blobStorage.read(reports[0].blobName)
    blob.toString().should.be.eql('hello')
  })

  it('should use template path for blobname when save: true', async () => {
    const folder = await reporter.documentStore.collection('folders').insert({
      name: 'foldera'
    })
    await reporter.documentStore.collection('templates').insert({
      name: 'mytemplate',
      engine: 'none',
      content: 'hello',
      recipe: 'html',
      folder: {
        shortid: folder.shortid
      }
    })
    await reporter.render({
      options: { reports: { save: true } },
      template: {
        name: 'mytemplate'
      }
    })

    const reports = await reporter.documentStore.collection('reports').find({})
    reports[0].blobName.should.containEql('reports/foldera/mytemplate')
  })

  it('should store report entity and single report with async: true', async () => {
    return new Promise((resolve, reject) => {
      reporter.afterRenderListeners.add('test', async (req, res) => {
        if (res.content.toString() !== 'hello') {
          return
        }

        // now it should be saved
        try {
          const reports = await reporter.documentStore.collection('reports').find({})
          reports.should.have.length(1)
          const blob = await reporter.blobStorage.read(reports[0].blobName)
          blob.toString().should.be.eql('hello')
        } catch (e) {
          reject(e)
        }

        resolve()
      })

      reporter.render({
        options: { reports: { async: true } },
        template: {
          engine: 'none',
          content: 'hello',
          name: 'name',
          recipe: 'html'
        }
      }).catch(reject)
    })
  })

  it('should produce report entity with public: true', async () => {
    await reporter.render({
      options: {
        reports: { save: true, public: true }
      },
      template: {
        engine: 'none',
        content: 'hello',
        name: 'name',
        recipe: 'html'
      }
    })

    const reports = await reporter.documentStore.collection('reports').find({})
    reports.should.have.length(1)
    reports[0].public.should.be.True()
  })

  it('should produce report entity with public: true and async: true', async () => {
    await reporter.render({
      options: {
        reports: { async: true, public: true }
      },
      template: {
        engine: 'none',
        content: 'hello',
        name: 'name',
        recipe: 'html'
      }
    })

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const reports = await reporter.documentStore.collection('reports').find({})
      reports.should.have.length(1)
      reports[0].public.should.be.True()
      if (reports[0].state === 'success') {
        break
      }
    }
  })

  it('should be able to read stored report through link', async () => {
    const request = {
      options: { reports: { save: true } },
      template: {
        engine: 'none',
        content: 'hello',
        name: 'name',
        recipe: 'html'
      }
    }

    const response = await reporter.render(request)

    return supertest(reporter.express.app)
      .get('/reports/' + response.meta.reportId + '/content')
      .expect(200)
      .parse((res, cb) => {
        res.data = ''
        res.on('data', (chunk) => (res.data += chunk))
        res.on('end', () => cb(null, res.data))
      })
      .expect((res) => {
        res.body.should.be.eql('hello')
      })
  })

  it('should return immediate response with link to status when async specified', async () => {
    const request = {
      options: { reports: { async: true } },
      template: { content: 'foo', recipe: 'html', engine: 'none' },
      context: { http: { baseUrl: 'http://localhost' } }
    }

    const waitForAsyncFinishPromise = new Promise((resolve) => {
      reporter.afterRenderListeners.add('test', () => {
        resolve()
      })
    })

    const response = await reporter.render(request)
    response.content.toString().should.containEql('Async rendering in progress')
    response.meta.headers.Location.should.be.ok()

    return waitForAsyncFinishPromise
  })

  it('should return 200 status code on /status if report is not finished', async () => {
    const r = await reporter.documentStore.collection('reports').insert({ name: 'foo', state: 'planned' })
    return supertest(reporter.express.app)
      .get('/reports/' + r._id + '/status')
      .expect(200)
  })

  it('should return 201 status code and Location header on /status if report is finished', async () => {
    const r = await reporter.documentStore.collection('reports').insert({ name: 'foo', blobName: 'foo', state: 'finished' })
    return supertest(reporter.express.app)
      .get('/reports/' + r._id + '/status')
      .expect(201)
      .expect('Location', /content/)
  })

  it('should produce correct link with public: true', (done) => {
    supertest(reporter.express.app)
      .post('/api/report')
      .send({
        template: {
          engine: 'none',
          content: 'hello',
          name: 'name',
          recipe: 'html'
        },
        options: {
          reports: { save: true, public: true }
        }
      }).expect('Permanent-Link', /reports\/public/).expect(200, done)
  })

  it('should pass inline data into the child rendering request when async specified', () => {
    const request = {
      options: { reports: { async: true } },
      data: { foo: 'hello' },
      template: {
        content: 'foo',
        recipe: 'html',
        engine: 'none'
      }
    }

    return new Promise((resolve, reject) => {
      reporter.tests.beforeRenderListeners.add('test', (req) => {
        if (req.options.reports && req.options.reports.async) {
          return
        }

        if (req.data.foo !== 'hello') {
          return reject(new Error('not propagated'))
        }
      })

      reporter.afterRenderListeners.add('test', () => {
        resolve()
      })

      reporter.render(request)
    })
  })

  it('should not pass any data when undefined is on the input when async specified', async () => {
    const request = {
      options: { recipe: 'html', reports: { async: true } },
      template: {
        content: 'foo',
        recipe: 'html',
        engine: 'none'
      }
    }

    return new Promise((resolve, reject) => {
      reporter.tests.beforeRenderListeners.add('test', (req) => {
        Object.keys(req.data).length.should.be.eql(0)
      })

      reporter.afterRenderListeners.add('test', (req) => {
        resolve()
      })

      reporter.render(request)
    })
  })

  it('should use attached data when no explicit data was specific on the input when async specified', async () => {
    const dataUsed = {
      message: 'bar'
    }

    const d1 = await reporter.documentStore.collection('data').insert({
      name: 'data',
      dataJson: JSON.stringify(dataUsed)
    })

    const t1 = await reporter.documentStore.collection('templates').insert({
      name: 'foo',
      engine: 'handlebars',
      content: '{{message}}',
      recipe: 'html',
      data: {
        shortid: d1.shortid
      }
    })

    const request = {
      template: {
        shortid: t1.shortid
      },
      options: { reports: { async: true } }
    }

    return new Promise((resolve, reject) => {
      reporter.afterRenderListeners.add('test', (req, res) => {
        if (req.options?.reports?.save) {
          const result = res.content.toString()

          try {
            result.should.be.eql(dataUsed.message)
            resolve()
          } catch (error) {
            reject(error)
          }
        }
      })

      reporter.render(request).catch(reject)
    })
  })

  it('nested requests without save:true should not produce reports', async () => {
    let optionsInNested
    reporter.tests.afterRenderListeners.add('test', (req, res) => {
      optionsInNested = req.options.reports
    })

    await reporter.render({
      template: {
        engine: 'none',
        content: 'main',
        name: 'name',
        recipe: 'html'
      },
      options: {
        reports: {
          save: true
        }
      }
    })

    should(optionsInNested).be.undefined()
  })

  it('nested requests with save true should also produce reports', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
      if (req.template.content === 'main') {
        await reporter.render({
          template: {
            engine: 'none',
            content: 'nested',
            name: 'name',
            recipe: 'html'
          },
          options: {
            reports: {
              save: true
            }
          }
        }, req)
      }
    })

    await reporter.render({
      template: {
        engine: 'none',
        content: 'main',
        name: 'name',
        recipe: 'html'
      }
    })

    const reports = await reporter.documentStore.collection('reports').find({})
    reports.should.have.length(1)

    const blob = await reporter.blobStorage.read(reports[0].blobName)
    blob.toString().should.be.eql('nested')
  })

  it('should store report after custom script afterRender modifies it', async () => {
    await reporter.render({
      options: { reports: { save: true } },
      template: {
        engine: 'none',
        content: 'hello',
        scripts: [{
          content: `
          function afterRender(req, res) {
            res.content = Buffer.from('changed')
          }
          `
        }],
        name: 'name',
        recipe: 'html'
      }
    })

    const report = await reporter.documentStore.collection('reports').findOne({})
    const blob = await reporter.blobStorage.read(report.blobName)
    blob.toString().should.be.eql('changed')
  })

  it('should not lose data when rawContent is passed and async:true is used', async () => {
    await reporter.render({
      rawContent: JSON.stringify({
        options: { reports: { async: true } },
        template: {
          engine: 'handlebars',
          content: '{{foo}}',
          recipe: 'html'
        },
        data: {
          foo: 'hello'
        }
      })
    })

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const report = await reporter.documentStore.collection('reports').findOne({})
      if (report?.state !== 'success') {
        continue
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      const blob = await reporter.blobStorage.read(report.blobName)
      blob.toString().should.be.eql('hello')
      break
    }
  })

  it('should apply inline data when async:true is used and sample data attached', async () => {
    await reporter.documentStore.collection('data').insert({
      shortid: 'data',
      name: 'data',
      dataJson: JSON.stringify({
        foo: 'original'
      })
    })
    await reporter.documentStore.collection('templates').insert({
      engine: 'handlebars',
      content: '{{foo}}',
      recipe: 'html',
      name: 'template',
      data: {
        shortid: 'data'
      }
    })
    await reporter.render({
      rawContent: JSON.stringify({
        options: { reports: { async: true } },
        template: {
          name: 'template'
        },
        data: {
          foo: 'hello'
        }
      })
    })

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const report = await reporter.documentStore.collection('reports').findOne({})
      if (report?.state !== 'success') {
        continue
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      const blob = await reporter.blobStorage.read(report.blobName)
      blob.toString().should.be.eql('hello')
      break
    }
  })
})

describe('with reports extension and clean enabled', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
    reporter.use(require('../')({
      cleanInterval: '100ms',
      cleanThreshold: '1ms'
    }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should remove old reports', async () => {
    await reporter.render({ template: { content: 'foo', engine: 'none', recipe: 'html' }, options: { reports: { save: true } } })
    await delay(200)
    const reports = await reporter.documentStore.collection('reports').find({})
    reports.should.have.length(0)
  })
})

describe('with reports extension and clean enabled but long threshold', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport()
    reporter.use(require('../')({
      cleanInterval: '100ms',
      cleanThreshold: '1d'
    }))

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should remove old reports', async () => {
    await reporter.render({ template: { content: 'foo', engine: 'none', recipe: 'html' }, options: { reports: { save: true } } })
    await delay(100)
    const reports = await reporter.documentStore.collection('reports').find({})
    reports.should.have.length(1)
  })
})

function delay (timeToWait) {
  return new Promise((resolve) => setTimeout(resolve, timeToWait))
}
