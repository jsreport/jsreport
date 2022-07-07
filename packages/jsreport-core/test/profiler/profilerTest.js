const should = require('should')
const jsreport = require('../../')
const { applyPatch } = require('../../lib/worker/render/diff')

describe('profiler', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      profiler: {
        maxDiffSize: '1mb'
      }
    })
    reporter.use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should emit profile events', async () => {
    const renderReq = {
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'html',
        helpers: 'console.log(\'foo\')'
      }
    }

    const profiler = reporter.attachProfiler(renderReq)
    const events = []
    profiler.on('profile', (m) => events.push(m))

    await reporter.render(renderReq)

    // evry operation start should have a matching end
    for (const event of events.filter(m => m.type === 'operationStart')) {
      events.find(m => m.operationId === event.operationId && m.type === 'operationEnd').should.be.ok()
    }

    should(events[0].previousOperationId).be.null()

    // evry operation start except first one should have valid previousOperationId
    for (const event of events.filter(m => m.type === 'operationStart').slice(1)) {
      events.find(m => m.operationId === event.previousOperationId).should.be.ok()
      event.operationId.should.not.be.eql(event.previousOperationId)
    }

    // all operations should produce valid req json after patch apply
    let currentReqStr = ''
    for (const event of events) {
      if ((event.type === 'operationStart' || event.type === 'operationEnd') && event.doDiffs !== false) {
        currentReqStr = applyPatch(currentReqStr, event.req.diff)
        JSON.parse(currentReqStr)
      }
    }

    // should produce proper result after applying diffs
    let currentResBuffer = Buffer.from('')
    for (const event of events) {
      if ((event.type === 'operationStart' || event.type === 'operationEnd') && event.doDiffs !== false) {
        if (event.res.content == null) {
          continue
        }

        currentResBuffer = Buffer.from(applyPatch(currentResBuffer.toString(), event.res.content.content))
      }
    }
    currentResBuffer.toString().should.be.eql('Hello')
    events.find(m => m.type === 'log' && m.message.includes('foo') && m.previousOperationId != null).should.be.ok()
  })

  it('should produce events with base64 encoded binary res', async () => {
    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.extensionsManager.recipes.push({
        name: 'profilerRecipe',
        execute: (req, res) => {
          res.content = Buffer.from([1])
        }
      })
    })

    const renderReq = {
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'profilerRecipe'
      }
    }

    const profiler = reporter.attachProfiler(renderReq)
    const events = []
    profiler.on('profile', (m) => events.push(m))

    await reporter.render(renderReq)

    let currentResBuffer = Buffer.from('')
    for (const event of events) {
      if ((event.type === 'operationStart' || event.type === 'operationEnd') && event.doDiffs !== false) {
        if (event.res.content == null) {
          continue
        }

        if (event.res.content.encoding === 'diff') {
          currentResBuffer = Buffer.from(applyPatch(currentResBuffer.toString(), event.res.content.content))
        } else {
          currentResBuffer = Buffer.from(event.res.content.content, 'base64')
        }
      }
    }
    currentResBuffer[0].should.be.eql(1)
  })

  it('child render should include correct previousOperationId', async () => {
    reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
      if (req.template.content === 'main') {
        const childResponse = await reporter.render({
          template: {
            content: 'child',
            engine: 'none',
            recipe: 'html'
          }
        }, req)
        req.template.content += childResponse.content.toString()
      }
    })

    const renderReq = {
      template: {
        content: 'main',
        engine: 'none',
        recipe: 'html'
      }
    }

    const profiler = reporter.attachProfiler(renderReq)
    const events = []
    profiler.on('profile', (m) => events.push(m))

    await reporter.render(renderReq)
    const childRenderStart = events.slice(1).find(m => m.type === 'operationStart' && m.subtype === 'render')
    childRenderStart.previousOperationId.should.be.eql(events[0].operationId)
  })

  it('should persist profiles without req/res', async () => {
    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    let profile
    while (true) {
      profile = await reporter.documentStore.collection('profiles').findOne({})
      if (profile && profile.state === 'success') {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }

    profile.state.should.be.eql('success')
    profile.timestamp.should.be.Date()
    should(profile).be.ok()

    const content = await reporter.blobStorage.read(profile.blobName)

    const events = content.toString().split('\n').filter(l => l).map(JSON.parse)
    for (const m of events) {
      should(m.req).not.be.ok()
    }

    events.find(m => m.type === 'log' && m.message.includes('Executing recipe')).should.be.ok()
  })

  it('should persist profiles when request errors', async () => {
    reporter.tests.beforeRenderEval((req) => {
      throw new Error('My error')
    })
    try {
      await reporter.render({
        template: {
          engine: 'none',
          recipe: 'html',
          content: 'Hello'
        }
      })
    } catch (e) {

    }

    let profile
    while (true) {
      profile = await reporter.documentStore.collection('profiles').findOne({})
      if (profile && profile.state === 'error') {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    profile.state.should.be.eql('error')

    const content = await reporter.blobStorage.read(profile.blobName)
    const events = content.toString().split('\n').filter(l => l).map(JSON.parse)
    const errorMesage = events.find(m => m.type === 'error')
    should(errorMesage).be.ok()
  })

  it('should persist profile also when request doesnt reach the worker', async () => {
    reporter.beforeRenderListeners.add('test', () => {
      throw new Error('My error')
    })

    try {
      await reporter.render({
        template: {
          engine: 'none',
          recipe: 'html',
          content: 'Hello'
        }
      })
    } catch (e) {

    }

    let profile

    while (true) {
      profile = await reporter.documentStore.collection('profiles').findOne({})
      if (profile != null && profile.state === 'error') {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    profile.state.should.be.eql('error')

    const content = await reporter.blobStorage.read(profile.blobName)
    const events = content.toString().split('\n').filter(l => l).map(JSON.parse)
    const errorMesage = events.find(m => m.type === 'error')
    should(errorMesage).be.ok()
  })

  it('should persist profiles with req/res when settings profiler.mode is full', async () => {
    await reporter.settings.addOrSet('profiler', { mode: 'full' })

    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    let profile = await reporter.documentStore.collection('profiles').findOne({})
    while (true) {
      profile = await reporter.documentStore.collection('profiles').findOne({})
      if (profile != null && profile.state === 'success') {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    const content = await reporter.blobStorage.read(profile.blobName)

    const events = content.toString().split('\n').filter(l => l).map(JSON.parse)
    for (const m of events.filter(m => m.type !== 'log' && m.doDiffs !== false)) {
      should(m.req).be.ok()
    }
  })

  it('should persist no profile entity when settings profiler.mode is disabled ', async () => {
    await reporter.settings.addOrSet('profiler', { mode: 'disabled' })

    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const profile = await reporter.documentStore.collection('profiles').findOne({})
    should(profile).be.null()
  })

  it('should persist no profile entity when settings profiler.mode empty but reporter.options.profiler.defaultMode eqls to disabled ', async () => {
    reporter.options.profiler.defaultMode = 'disabled'

    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const profile = await reporter.documentStore.collection('profiles').findOne({})
    should(profile).be.null()
  })

  it('should delete profile blob when profile is deleted', async () => {
    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    const profile = await reporter.documentStore.collection('profiles').findOne({})
    await reporter.documentStore.collection('profiles').remove({})
    return reporter.blobStorage.read(profile.blobName).should.be.rejectedWith(/found/)
  })

  it('response meta should include profileId', async () => {
    const res = await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    res.meta.profileId.should.be.ok()
    const profile = await reporter.documentStore.collection('profiles').findOne({ _id: res.meta.profileId })
    profile.should.be.ok()
  })

  it('should set finished state also for render requests invoked from the beforeRenderListeners', async () => {
    let _resolve
    const promise = new Promise(resolve => {
      _resolve = resolve
    })
    reporter.beforeRenderListeners.insert(0, 'test', async (req, res) => {
      if (req.template.content !== 'main') {
        return
      }
      req.context.returnResponseAndKeepWorker = true
      res.content = Buffer.from('main')
      process.nextTick(() => {
        reporter.render({
          template: {
            content: 'hello',
            engine: 'none',
            recipe: 'html'
          }
        }).then(() => _resolve())
      })
    })
    await reporter.render({
      template: {
        content: 'main',
        engine: 'none',
        recipe: 'html'
      }
    })
    await promise

    let profiles

    while (true) {
      profiles = await reporter.documentStore.collection('profiles').find({})
      if (profiles.length === 2 && profiles[0].state === 'success' && profiles[1].state === 'success') {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 20))
    }

    profiles[0].state.should.be.eql('success')
    profiles[1].state.should.be.eql('success')
  })

  it('should skip diff when response size gt profiler.maxDiffSize', async () => {
    reporter.tests.beforeRenderEval((req, res, { reporter }) => {
      reporter.extensionsManager.recipes.push({
        name: 'profilerRecipe',
        execute: (req, res) => {
          res.content = Buffer.alloc(reporter.options.profiler.maxDiffSize + 1, 'x')
        }
      })
    })

    const renderReq = {
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'profilerRecipe'
      }
    }

    const profiler = reporter.attachProfiler(renderReq)
    const events = []
    profiler.on('profile', (m) => events.push(m))
    await reporter.render(renderReq)
    const renderEndEvent = events.find(e => e.type === 'operationEnd' && e.subtype === 'render')
    renderEndEvent.res.content.tooLarge.should.be.true()
  })

  it('should skip diff when request size gt profiler.maxDiffSize', async () => {
    const renderReq = {
      template: {
        content: 'Hello',
        engine: 'none',
        recipe: 'html'
      },
      data: {
        str: '#'.repeat(reporter.options.profiler.maxDiffSize + 1)
      }
    }

    const profiler = reporter.attachProfiler(renderReq)
    const events = []
    profiler.on('profile', (m) => events.push(m))
    await reporter.render(renderReq)
    const renderStartEvent = events.find(e => e.type === 'operationStart' && e.subtype === 'render')
    renderStartEvent.req.tooLarge.should.be.true()
  })
})

describe('profiler with custom blobStorage', () => {
  let reporter

  beforeEach(async () => {
    reporter = jsreport()
    reporter.use(jsreport.tests.listeners())
    await reporter.init()
    reporter.blobStorage.write = (blobName, buffer) => ('xxx-' + blobName)
  })

  afterEach(() => reporter.close())

  it('should use blobName returned from the blobStorage.write', async () => {
    await reporter.render({
      template: {
        engine: 'none',
        recipe: 'html',
        content: 'Hello'
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    const profile = await reporter.documentStore.collection('profiles').findOne({})
    profile.blobName.startsWith('xxx-').should.be.true()
  })
})

describe('profiler with timeout', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      reportTimeout: 50,
      reportTimeoutMargin: 0
    })
    reporter.use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should persist profile when request timeout', async () => {
    reporter.tests.afterRenderEval = (fn) => {
      return new Promise((resolve) => setTimeout(resolve, 200))
    }

    try {
      await reporter.render({
        template: {
          engine: 'none',
          recipe: 'html',
          content: 'Hello'
        }
      })
    } catch (e) {

    }

    const profile = await reporter.documentStore.collection('profiles').findOne({})
    profile.state.should.be.eql('error')

    const content = await reporter.blobStorage.read(profile.blobName)
    const events = content.toString().split('\n').filter(l => l).map(JSON.parse)
    const errorMessage = events.find(m => m.type === 'error')
    should(errorMessage).be.ok()
  })
})

describe('profiler cleanup', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      profiler: {
        maxProfilesHistory: 2,
        cleanupInterval: '50ms'
      }
    })
    reporter.use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter.close())
  it('should clean old profiles', async () => {
    for (let i = 0; i < 3; i++) {
      await reporter.render({
        template: {
          engine: 'none',
          recipe: 'html',
          content: 'Hello'
        }
      })
    }
    await new Promise((resolve) => setTimeout(resolve, 60))
    const profiles = await reporter.documentStore.collection('profiles').find({})
    profiles.should.have.length(2)
  })
})
