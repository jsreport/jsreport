const extend = require('node.extend.without.arrays')
const isbinaryfile = require('isbinaryfile').isBinaryFileSync
const omit = require('lodash.omit')
const { createPatch } = require('./diff')
const generateRequestId = require('../../shared/generateRequestId')

class Profiler {
  constructor (reporter) {
    this.reporter = reporter

    this.reporter.addRequestContextMetaConfig('profiling', { sandboxHidden: true })
    this.reporter.addRequestContextMetaConfig('resolvedTemplate', { sandboxHidden: true })

    this.reporter.beforeMainActionListeners.add('profiler', (actionName, data, req) => {
      if (actionName === 'log' && req.context.profiling) {
        data.previousOperationId = req.context.profiling.lastOperationId
      }
    })

    this.profiledRequestsMap = new Map()
    const profileEventsFlushInterval = setInterval(() => this.flush(), 100)
    profileEventsFlushInterval.unref()

    this.reporter.closeListeners.add('profiler', this, () => {
      if (profileEventsFlushInterval) {
        clearInterval(profileEventsFlushInterval)
      }
    })
  }

  async flush (id) {
    const toProcess = id == null ? [...this.profiledRequestsMap.keys()] : [id]

    for (const id of toProcess) {
      const profilingInfo = this.profiledRequestsMap.get(id)
      if (profilingInfo) {
        const batch = profilingInfo.batch
        profilingInfo.batch = []

        if (batch.length > 0) {
          await this.reporter.executeMainAction('profile', batch, profilingInfo.req).catch((e) => this.reporter.logger.error(e, profilingInfo.req))
        }
      }
    }
  }

  emit (m, req, res) {
    m.timestamp = m.timestamp || new Date().getTime()

    if (m.type === 'log' && !req.context.profiling) {
      // this means there is an action running, but not the render, and it is logging...
      return this.reporter.executeMainAction('log', m, req)
    }

    m.id = generateRequestId()

    if (m.previousEventId == null && req.context.profiling.lastEventId && m.type !== 'log') {
      m.previousEventId = req.context.profiling.lastEventId
    }

    if (m.type !== 'log') {
      req.context.profiling.lastEventId = m.id
      m.operationId = m.operationId || generateRequestId()
    }

    if (m.previousOperationId == null && req.context.profiling.lastOperationId) {
      m.previousOperationId = req.context.profiling.lastOperationId
    }

    if (m.type === 'operationStart') {
      req.context.profiling.lastOperationId = m.operationId
    }

    if (m.doDiffs !== false && req.context.profiling.mode === 'full' && (m.type === 'operationStart' || m.type === 'operationEnd')) {
      let originalResContent = res.content

      // if content is empty assume null to keep old logic working without major changes
      // (here and in studio)
      if (originalResContent != null && originalResContent.length === 0) {
        originalResContent = null
      }

      let content = originalResContent

      if (content != null) {
        if (content.length > this.reporter.options.profiler.maxDiffSize) {
          content = {
            tooLarge: true
          }
        } else {
          if (isbinaryfile(content)) {
            content = {
              content: originalResContent.toString('base64'),
              encoding: 'base64'
            }
          } else {
            content = {
              content: createPatch('res', req.context.profiling.resLastVal ? req.context.profiling.resLastVal.toString() : '', originalResContent.toString(), 0),
              encoding: 'diff'
            }
          }
        }
      }

      const stringifiedResMeta = JSON.stringify(omit(res.meta, ['logs']))

      m.res = { content, meta: { diff: createPatch('resMeta', req.context.profiling.resMetaLastVal || '', stringifiedResMeta, 0) } }

      const stringifiedReq = JSON.stringify({ template: req.template, data: req.data }, null, 2)

      m.req = { }
      if (stringifiedReq.length * 4 > this.reporter.options.profiler.maxDiffSize) {
        m.req.tooLarge = true
      } else {
        m.req.diff = createPatch('req', req.context.profiling.reqLastVal || '', stringifiedReq, 0)
      }

      req.context.profiling.resLastVal = (originalResContent == null || isbinaryfile(originalResContent) || content.tooLarge) ? null : originalResContent.toString()
      req.context.profiling.resMetaLastVal = stringifiedResMeta
      req.context.profiling.reqLastVal = stringifiedReq
    }

    if (!this.profiledRequestsMap.has(req.context.rootId)) {
      this.profiledRequestsMap.set(req.context.rootId, { req, batch: [] })
    }

    this.profiledRequestsMap.get(req.context.rootId).batch.push(m)
    return m
  }

  async renderStart (req, parentReq, res) {
    let templateName = 'anonymous'
    let template = req.context.resolvedTemplate

    if (parentReq) {
      template = await this.reporter.templates.resolveTemplate(req)

      // store a copy to prevent side-effects
      req.context.resolvedTemplate = template != null ? extend(true, {}, template) : template
    } else {
      template = req.context.resolvedTemplate
    }

    if (template != null && template.name != null) {
      templateName = template.name
    }

    const profilerEvent = {
      type: 'operationStart',
      subtype: 'render',
      name: templateName,
      previousOperationId: parentReq ? parentReq.context.profiling.lastOperationId : null
    }

    return this.emit(profilerEvent, req, res)
  }

  async renderEnd (operationId, req, res, err) {
    if (err) {
      err.previousOperationId = err.previousOperationId || req.context.profiling.lastOperationId
    } else {
      await this.emit({
        type: 'operationEnd',
        subtype: 'render',
        operationId
      }, req, res)
    }

    if (!req.context.isChildRequest) {
      const profilingInfo = this.profiledRequestsMap.get(req.context.rootId)
      if (profilingInfo) {
        this.profiledRequestsMap.delete(req.context.rootId)

        if (profilingInfo.batch.length > 0) {
          await this.reporter.executeMainAction('profile', profilingInfo.batch, req)
        }
      }
    }
  }
}

module.exports = (reporter) => {
  return new Profiler(reporter)
}
