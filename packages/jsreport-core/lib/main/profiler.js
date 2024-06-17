const EventEmitter = require('events')
const Transport = require('winston-transport')
const extend = require('node.extend.without.arrays')
const generateRequestId = require('../shared/generateRequestId')
const fs = require('fs/promises')
const { SPLAT } = require('triple-beam')
const promisify = require('util').promisify
const stringifyAsync = promisify(require('yieldable-json').stringifyAsync)

module.exports = (reporter) => {
  reporter.documentStore.registerEntityType('ProfileType', {
    templateShortid: { type: 'Edm.String', referenceTo: 'templates' },
    timestamp: { type: 'Edm.DateTimeOffset', schema: { type: 'null' } },
    finishedOn: { type: 'Edm.DateTimeOffset', schema: { type: 'null' } },
    state: { type: 'Edm.String' },
    error: { type: 'Edm.String' },
    mode: { type: 'Edm.String', schema: { enum: ['full', 'standard', 'disabled'] } },
    blobName: { type: 'Edm.String' },
    timeout: { type: 'Edm.Int32' }
  })

  reporter.documentStore.registerEntitySet('profiles', {
    entityType: 'jsreport.ProfileType',
    exportable: false
  })

  const profilersMap = new Map()
  const profilerOperationsChainsMap = new Map()
  const profilerRequestMap = new Map()

  function runInProfilerChain (fnOrOptions, req) {
    if (req.context.profiling == null || req.context.profiling.mode === 'disabled') {
      return
    }

    let fn
    let cleanFn

    if (typeof fnOrOptions === 'function') {
      fn = fnOrOptions
    } else {
      fn = fnOrOptions.fn
      cleanFn = fnOrOptions.cleanFn
    }

    // this only happens when rendering remote delegated requests on docker workers
    // there won't be operations chain because the request started from another server
    if (!profilerOperationsChainsMap.has(req.context.rootId)) {
      return
    }

    profilerOperationsChainsMap.set(req.context.rootId, profilerOperationsChainsMap.get(req.context.rootId).then(async () => {
      if (cleanFn) {
        cleanFn()
      }

      if (req.context.profiling.chainFailed) {
        return
      }

      try {
        if (fn) {
          await fn()
        }
      } catch (e) {
        reporter.logger.warn('Failed persist profile', e)
        req.context.profiling.chainFailed = true
      }
    }))
  }

  function createProfileMessage (m, req) {
    m.timestamp = new Date().getTime()
    m.id = generateRequestId()
    m.previousOperationId = m.previousOperationId || null
    if (m.type !== 'log') {
      m.operationId = m.operationId || generateRequestId()
      req.context.profiling.lastOperationId = m.operationId
      req.context.profiling.lastEventId = m.id
    }

    return m
  }

  function emitProfiles ({ events, log = true }, req) {
    if (events.length === 0) {
      return
    }

    let lastOperation

    for (const m of events) {
      if (m.type === 'log') {
        if (log) {
          reporter.logger[m.level](m.message, { ...req, ...m.meta, timestamp: m.timestamp, logged: true })
        }
      } else {
        lastOperation = m
      }

      if (profilersMap.has(req.context.rootId)) {
        profilersMap.get(req.context.rootId).emit('profile', m)
      }
    }

    if (lastOperation != null) {
      req.context.profiling.lastOperation = lastOperation
    }

    runInProfilerChain(async () => {
      const stringifiedMessages = req.context.mode === 'full'
        ? await Promise.all(events.map(m => stringifyAsync(m)))
        : events.map(m => JSON.stringify(m))
      await fs.appendFile(req.context.profiling.logFilePath, Buffer.from(stringifiedMessages.join('\n') + '\n'))
    }, req)
  }

  reporter.registerMainAction('profile', async (eventsOrOptions, _req) => {
    let req = _req

    // if there is request stored here then take it, this is needed
    // for docker workers remote requests, so the emitProfile can work
    // with the real render request object
    if (profilerRequestMap.has(req.context.rootId) && req.__isJsreportRequest__ == null) {
      req = profilerRequestMap.get(req.context.rootId)
    }

    let events
    let log

    if (Array.isArray(eventsOrOptions)) {
      events = eventsOrOptions
    } else {
      events = eventsOrOptions.events
      log = eventsOrOptions.log
    }

    const params = { events }

    if (log != null) {
      params.log = log
    }

    return emitProfiles(params, req)
  })

  reporter.attachProfiler = (req, profileMode) => {
    req.context = req.context || {}
    req.context.rootId = reporter.generateRequestId()
    req.context.profiling = {
      mode: profileMode == null ? 'full' : profileMode
    }
    const profiler = new EventEmitter()
    profilersMap.set(req.context.rootId, profiler)

    return profiler
  }

  reporter.beforeRenderWorkerAllocatedListeners.add('profiler', async (req) => {
    req.context.profiling = req.context.profiling || {}

    if (req.context.profiling.enabled === false) {
      return
    }

    if (req.context.profiling.mode == null) {
      const profilerSettings = await reporter.settings.findValue('profiler', req)
      const defaultMode = reporter.options.profiler.defaultMode || 'standard'
      req.context.profiling.mode = (profilerSettings != null && profilerSettings.mode != null) ? profilerSettings.mode : defaultMode
    }

    profilerOperationsChainsMap.set(req.context.rootId, Promise.resolve())

    req.context.profiling.lastOperation = null

    const profile = {
      _id: reporter.documentStore.generateId(),
      timestamp: new Date(),
      state: 'queued',
      mode: req.context.profiling.mode
    }

    const { pathToFile } = await reporter.writeTempFile((uuid) => `${uuid}.log`, '')
    req.context.profiling.logFilePath = pathToFile

    runInProfilerChain(async () => {
      req.context.skipValidationFor = profile
      await reporter.documentStore.collection('profiles').insert(profile, req)
    }, req)

    req.context.profiling.entity = profile

    const profileStartOperation = createProfileMessage({
      type: 'operationStart',
      subtype: 'profile',
      data: profile,
      doDiffs: false
    }, req)

    req.context.profiling.profileStartOperationId = profileStartOperation.operationId

    emitProfiles({ events: [profileStartOperation] }, req)

    emitProfiles({
      events: [createProfileMessage({
        type: 'log',
        level: 'info',
        message: `Render request ${req.context.reportCounter} queued for execution and waiting for available worker`,
        previousOperationId: profileStartOperation.operationId
      }, req)]
    }, req)
  })

  reporter.beforeRenderListeners.add('profiler', async (req, res) => {
    const update = {
      state: 'running',
      // the timeout needs to be calculated later here, because the req.options.timeout isnt yet parsed in beforeRenderWorkerAllocatedListeners
      timeout: reporter.options.enableRequestReportTimeout && req.options.timeout ? req.options.timeout : reporter.options.reportTimeout
    }

    // we set the request here because this listener will container the req which
    // the .render() starts
    profilerRequestMap.set(req.context.rootId, req)

    const template = await reporter.templates.resolveTemplate(req)

    if (template && template._id) {
      req.context.resolvedTemplate = extend(true, {}, template)

      update.templateShortid = template.shortid
    }

    runInProfilerChain(() => {
      req.context.skipValidationFor = update

      return reporter.documentStore.collection('profiles').update({
        _id: req.context.profiling.entity._id
      }, {
        $set: update
      }, req)
    }, req)

    Object.assign(req.context.profiling.entity, update)
  })

  reporter.afterRenderListeners.add('profiler', async (req, res) => {
    emitProfiles({
      events: [createProfileMessage({
        type: 'operationEnd',
        doDiffs: false,
        previousEventId: req.context.profiling.lastEventId,
        previousOperationId: req.context.profiling.lastOperationId,
        operationId: req.context.profiling.profileStartOperationId
      }, req)]
    }, req)

    res.meta.profileId = req.context.profiling?.entity?._id

    runInProfilerChain(async () => {
      let blobName = `profiles/${req.context.rootId}.log`

      if (req.context.resolvedTemplate) {
        const templatePath = await reporter.folders.resolveEntityPath(req.context.resolvedTemplate, 'templates', req)
        blobName = `profiles/${templatePath.substring(1)}/${req.context.rootId}.log`
      }

      const content = await fs.readFile(req.context.profiling.logFilePath)
      blobName = await reporter.blobStorage.write(blobName, content, req)
      await fs.unlink(req.context.profiling.logFilePath)

      const update = {
        state: 'success',
        finishedOn: new Date(),
        blobName
      }

      req.context.skipValidationFor = update

      await reporter.documentStore.collection('profiles').update({
        _id: req.context.profiling.entity._id
      }, {
        $set: update
      }, req)
    }, req)

    // we don't clean the profiler maps here, we do it later in main reporter .render,
    // because the renderErrorListeners can be invoked if the afterRenderListener fails
  })

  reporter.renderErrorListeners.add('profiler', async (req, res, e) => {
    res.meta.profileId = req.context.profiling?.entity?._id

    if (req.context.profiling?.entity != null) {
      emitProfiles({
        events: [{
          type: 'error',
          timestamp: new Date().getTime(),
          ...e,
          id: generateRequestId(),
          stack: e.stack,
          message: e.message
        }]
      }, req)

      runInProfilerChain(async () => {
        const update = {
          state: 'error',
          finishedOn: new Date(),
          error: e.toString()
        }

        if (req.context.profiling.logFilePath != null) {
          let blobName = `profiles/${req.context.rootId}.log`

          if (req.context.resolvedTemplate) {
            const templatePath = await reporter.folders.resolveEntityPath(req.context.resolvedTemplate, 'templates', req)
            blobName = `profiles/${templatePath.substring(1)}/${req.context.rootId}.log`
          }

          const content = await fs.readFile(req.context.profiling.logFilePath)
          blobName = await reporter.blobStorage.write(blobName, content, req)
          await fs.unlink(req.context.profiling.logFilePath)
          update.blobName = blobName
        }

        req.context.skipValidationFor = update

        await reporter.documentStore.collection('profiles').update({
          _id: req.context.profiling.entity._id
        }, {
          $set: update
        }, req)
      }, req)

      // we don't clean the profiler maps here, we do it later in main reporter .render,
      // we do this to ensure a single and clear order
    }
  })

  // we want to add to profiles also log messages from the main
  const configuredPreviously = reporter.logger.__profilerConfigured__ === true
  if (!configuredPreviously) {
    // we emit from winston transport, so winston formatters can still format message
    class EmittingProfilesTransport extends Transport {
      log (info, callback) {
        setImmediate(() => {
          this.emit('logged', info)
        })

        if (info[SPLAT]) {
          const [req] = info[SPLAT]

          if (req && req.context && req.logged !== true) {
            emitProfiles({
              events: [createProfileMessage({
                type: 'log',
                level: info.level,
                message: info.message,
                previousOperationId: req.context.profiling?.lastOperationId
              }, req)],
              log: false
            }, req)
          }
        }

        callback()
      }
    }

    reporter.logger.add(new EmittingProfilesTransport({
      format: reporter.logger.format,
      level: 'debug'
    }))

    reporter.logger.__profilerConfigured__ = true
  }

  let profilesCleanupInterval
  let fullModeDurationCheckInterval

  reporter.initializeListeners.add('profiler', async () => {
    reporter.documentStore.collection('profiles').beforeRemoveListeners.add('profiles', async (query, req) => {
      const profiles = await reporter.documentStore.collection('profiles').find(query, req)

      for (const profile of profiles) {
        if (profile.blobName != null) {
          await reporter.blobStorage.remove(profile.blobName)
        }
      }
    })

    // exposing it to jo for override
    function profilesCleanupExec () {
      return reporter._profilesCleanup()
    }

    function fullModeDurationCheckExec () {
      return reporter._profilesFullModeDurationCheck()
    }

    profilesCleanupInterval = setInterval(profilesCleanupExec, reporter.options.profiler.cleanupInterval)
    profilesCleanupInterval.unref()

    fullModeDurationCheckInterval = setInterval(fullModeDurationCheckExec, reporter.options.profiler.fullModeDurationCheckInterval)
    fullModeDurationCheckInterval.unref()

    await reporter._profilesCleanup()
  })

  reporter.closeListeners.add('profiler', async () => {
    if (profilesCleanupInterval) {
      clearInterval(profilesCleanupInterval)
    }

    if (fullModeDurationCheckInterval) {
      clearInterval(fullModeDurationCheckInterval)
    }

    for (const key of profilerOperationsChainsMap.keys()) {
      const profileAppendPromise = profilerOperationsChainsMap.get(key)
      if (profileAppendPromise) {
        await profileAppendPromise
      }
    }

    profilersMap.clear()
    profilerOperationsChainsMap.clear()
    profilerRequestMap.clear()
  })

  let profilesCleanupRunning = false

  reporter._profilesCleanup = async function profilesCleanup () {
    if (profilesCleanupRunning) {
      return
    }

    profilesCleanupRunning = true

    let lastError

    try {
      const profilesToRemove = await reporter.documentStore.collection('profiles')
        .find({}, { _id: 1 }).sort({ timestamp: -1 })
        .skip(reporter.options.profiler.maxProfilesHistory)
        .toArray()

      for (const profile of profilesToRemove) {
        if (reporter.closed || reporter.closing) {
          return
        }

        try {
          await reporter.documentStore.collection('profiles').remove({
            _id: profile._id
          })
        } catch (e) {
          lastError = e
        }
      }

      const notFinishedProfiles = await reporter.documentStore.collection('profiles')
        .find({ $or: [{ state: 'running' }, { state: 'queued' }] }, { _id: 1, timeout: 1, timestamp: 1 })
        .toArray()

      for (const profile of notFinishedProfiles) {
        if (reporter.closed || reporter.closing) {
          return
        }

        if (!profile.timeout) {
          // we can calculate profile timeout only after worker parses request and req.options.timeout is calculated
          // if the timeout isnt calculated we error orphans that hangs for very long time before worker gets allocated and parses req
          if ((profile.timestamp.getTime() + reporter.options.profiler.maxUnallocatedProfileAge) < new Date().getTime()) {
            try {
              await reporter.documentStore.collection('profiles').update({
                _id: profile._id
              }, {
                $set: {
                  state: 'error',
                  finishedOn: new Date(),
                  error: `The request wasn't parsed before ${reporter.options.profiler.maxUnallocatedProfileAge}ms. This can happen when the server is unexpectedly stopped.`
                }
              })
            } catch (e) {
              lastError = e
            }
          }
          continue
        }

        const whenShouldBeFinished = profile.timestamp.getTime() + profile.timeout + reporter.options.reportTimeoutMargin * 2
        if (whenShouldBeFinished > new Date().getTime()) {
          continue
        }

        try {
          await reporter.documentStore.collection('profiles').update({
            _id: profile._id
          }, {
            $set: {
              state: 'error',
              finishedOn: new Date(),
              error: 'The server did not update the report profile before its timeout. This can happen when the server is unexpectedly stopped.'
            }
          })
        } catch (e) {
          lastError = e
        }
      }
    } catch (e) {
      reporter.logger.warn('Profile cleanup failed', e)
    } finally {
      profilesCleanupRunning = false
    }

    if (lastError) {
      reporter.logger.warn('Profile cleanup failed for some entities, last error:', lastError)
    }
  }

  reporter._profilesFullModeDurationCheck = async function () {
    try {
      if (reporter.options.profiler.defaultMode === 'full') {
        return
      }
      const profiler = await reporter.documentStore.collection('settings').findOne({ key: 'profiler' })
      if (profiler == null || (profiler.modificationDate.getTime() + reporter.options.profiler.fullModeDuration) > new Date().getTime()) {
        return
      }

      const profilerValue = JSON.parse(profiler.value)

      if (profilerValue.mode !== 'full') {
        return
      }

      reporter.logger.info('Switching full mode profiling back to standard to avoid performance degradation.')
      await reporter.settings.addOrSet('profiler', { mode: 'standard' })
    } catch (e) {
      reporter.logger.warn('Failed to change profiling mode', e)
    }
  }

  return function cleanProfileInRequest (req) {
    // - req.context.profiling is empty only on an early error
    // that happens before setting the profiler.
    // - when profiling.mode is "disabled" there is no profiler chain to append
    // in both cases we want the clean code to happen immediately
    if (req.context.profiling?.entity == null || req.context.profiling?.mode === 'disabled') {
      profilersMap.delete(req.context.rootId)
      profilerOperationsChainsMap.delete(req.context.rootId)
      profilerRequestMap.delete(req.context.rootId)
      return
    }

    // this will get executed always even if some fn in the chain fails
    runInProfilerChain({
      cleanFn: () => {
        profilersMap.delete(req.context.rootId)
        profilerOperationsChainsMap.delete(req.context.rootId)
        profilerRequestMap.delete(req.context.rootId)
      }
    }, req)
  }
}
