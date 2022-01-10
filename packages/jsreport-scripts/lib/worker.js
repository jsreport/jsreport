/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension allowing to add custom javascript hooks into the rendering process.
 */
module.exports = function (reporter, definition) {
  reporter.addRequestContextMetaConfig('scriptsCache', { sandboxHidden: true })

  reporter.scripts = new Scripts(reporter, definition)
}

class Scripts {
  constructor (reporter, definition) {
    this.reporter = reporter
    this.definition = definition

    reporter.beforeScriptListeners = reporter.createListenerCollection('Scripts@beforeScript')

    reporter.beforeRenderListeners.insert({
      after: 'data',
      before: 'childTemplates'
    }, definition.name, reporter, this.handleBeforeRender.bind(this))

    reporter.afterRenderListeners.add(definition.name, reporter, this.handleAfterRender.bind(this))
  }

  async handleBeforeRender (req, res) {
    req.context.scriptsCache = await this._findScripts(req)

    let generalScriptsProfilerEvent
    let currentScriptProfilerEvent

    const onBeforeExecute = (script, topLevelFunctionsNames) => {
      if (req.context.scriptsCache.length && topLevelFunctionsNames.includes('beforeRender')) {
        if (generalScriptsProfilerEvent == null) {
          generalScriptsProfilerEvent = this.reporter.profiler.emit({
            type: 'operationStart',
            subtype: 'scriptsBeforeRender',
            name: 'scripts beforeRender'
          }, req, res)
        }

        currentScriptProfilerEvent = this.reporter.profiler.emit({
          type: 'operationStart',
          subtype: 'script',
          name: `scripts ${script.name || 'anonymous'}`,
          previousOperationId: generalScriptsProfilerEvent.operationId
        }, req, res)
      }
    }

    const onAfterExecute = () => {
      if (currentScriptProfilerEvent) {
        this.reporter.profiler.emit({
          type: 'operationEnd',
          operationId: currentScriptProfilerEvent.operationId
        }, req, res)

        currentScriptProfilerEvent = null
      }
    }

    for (const script of req.context.scriptsCache) {
      await this._runScript(req, res, {
        script,
        method: 'beforeRender',
        onBeforeExecute,
        onAfterExecute
      })
    }

    if (generalScriptsProfilerEvent) {
      this.reporter.profiler.emit({
        type: 'operationEnd',
        operationId: generalScriptsProfilerEvent.operationId
      }, req, res)
      req.context.profiling.lastOperationId = generalScriptsProfilerEvent.operationId
    }
  }

  async handleAfterRender (req, res) {
    let generalScriptsProfilerEvent
    let currentScriptProfilerEvent

    const onBeforeExecute = (script) => {
      if (req.context.scriptsCache.find(s => s.shouldRunAfterRender)) {
        if (generalScriptsProfilerEvent == null) {
          generalScriptsProfilerEvent = this.reporter.profiler.emit({
            type: 'operationStart',
            subtype: 'scriptsAfterRender',
            name: 'scripts afterRender'
          }, req, res)
        }

        currentScriptProfilerEvent = this.reporter.profiler.emit({
          type: 'operationStart',
          subtype: 'script',
          name: `scripts ${script.name || 'anonymous'}`,
          previousOperationId: generalScriptsProfilerEvent.operationId
        }, req, res)
      }
    }

    const onAfterExecute = () => {
      if (currentScriptProfilerEvent) {
        this.reporter.profiler.emit({
          type: 'operationEnd',
          operationId: currentScriptProfilerEvent.operationId
        }, req, res)

        currentScriptProfilerEvent = null
      }
    }

    for (const script of req.context.scriptsCache) {
      if (script.shouldRunAfterRender) {
        await this._runScript(req, res, {
          script,
          method: 'afterRender',
          onBeforeExecute,
          onAfterExecute
        })
      }
    }

    if (generalScriptsProfilerEvent) {
      this.reporter.profiler.emit({
        type: 'operationEnd',
        operationId: generalScriptsProfilerEvent.operationId
      }, req, res)
      req.context.profiling.lastOperationId = generalScriptsProfilerEvent.operationId
    }
  }

  async _runScript (req, res, { script, method, onBeforeExecute, onAfterExecute }) {
    this.reporter.logger.debug(`Executing script ${(script.name || script.shortid || 'anonymous')} (${method})`, req)

    await this.reporter.beforeScriptListeners.fire({ script }, req)

    const scriptExecResult = await (require('./executeScript')(this.reporter, { script, method, onBeforeExecute }, req, res))

    if (scriptExecResult.shouldRunAfterRender) {
      script.shouldRunAfterRender = true
    }

    if (scriptExecResult.requestCancel) {
      const error = this.reporter.createError(`Rendering req canceled from the script${
        scriptExecResult.additionalInfo != null ? `: ${scriptExecResult.additionalInfo}` : ''
      }`, {
        weak: true
      })

      if (scriptExecResult.statusCode) {
        error.statusCode = scriptExecResult.statusCode
      }

      error.canceled = true
      throw error
    }

    function merge (obj, obj2) {
      for (const key in obj2) {
        if (typeof obj2[key] === 'undefined') {
          continue
        }

        if (typeof obj2[key] !== 'object' || typeof obj[key] === 'undefined') {
          obj[key] = obj2[key]
        } else {
          merge(obj[key], obj2[key])
        }
      }
    }

    if (method === 'beforeRender') {
      req.data = scriptExecResult.req.data
      delete scriptExecResult.req.data
      merge(req, scriptExecResult.req)
      merge(res, scriptExecResult.res)
    }

    if (method === 'afterRender') {
      res.content = Buffer.from(scriptExecResult.res.content)
      delete scriptExecResult.res.content
      merge(res, scriptExecResult.res)

      req.data = scriptExecResult.req.data
      delete scriptExecResult.req.data
      merge(req, scriptExecResult.req)
    }

    onAfterExecute()

    return res
  }

  async _findScripts (req) {
    req.template.scripts = req.template.scripts || []

    const getSorterByName = () => {
      return (a, b) => {
        const nameA = a.name.toUpperCase()
        const nameB = b.name.toUpperCase()

        if (nameA < nameB) {
          return -1
        }

        if (nameA > nameB) {
          return 1
        }

        return 0
      }
    }

    const items = await Promise.all(req.template.scripts.map(async (script) => {
      if (script.content) {
        return script
      }

      const query = {}
      if (script.shortid) {
        query.shortid = script.shortid
      }

      if (script.name) {
        query.name = script.name
      }

      let items = await this.reporter.documentStore.collection('scripts').find(query, req)

      items = items.filter((s) => s.scope === 'template' || (s.scope == null && !s.isGlobal))

      if (items.length < 1) {
        const error = this.reporter.createError(`Script not found or user not authorized to read it (${
          (script.shortid || script.name)
        })`, {
          weak: true,
          statusCode: 403
        })

        throw error
      }
      return items[0]
    }))

    const globalItems = await this.reporter.documentStore.collection('scripts').find({
      $or: [
        { isGlobal: true },
        { scope: 'global' }
      ]
    }, req)

    // sort alphabetically asc
    globalItems.sort(getSorterByName())

    const folderItems = []

    if (req.context.resolvedTemplate != null) {
      let currentEntity = req.context.resolvedTemplate
      const scriptsByLevel = []

      do {
        const folderQuery = currentEntity.folder != null ? { shortid: currentEntity.folder.shortid } : null

        const scripts = await this.reporter.documentStore.collection('scripts').find({
          scope: 'folder',
          folder: folderQuery
        }, req)

        if (scripts.length > 0) {
          scriptsByLevel.push([...scripts])
        }

        if (currentEntity.folder != null) {
          currentEntity = await this.reporter.documentStore.collection('folders').findOne({
            shortid: currentEntity.folder.shortid
          }, req)
        } else {
          currentEntity = null
        }
      } while (currentEntity != null)

      scriptsByLevel.reverse()

      for (const currentScripts of scriptsByLevel) {
        currentScripts.sort(getSorterByName())
        folderItems.push(...currentScripts)
      }
    } else {
      // if anonymous request just search for scripts with scope "folder" at the top level
      const folders = await this.reporter.documentStore.collection('scripts').find({
        scope: 'folder',
        folder: null
      }, req)

      folderItems.push(...folders)
      // sort alphabetically asc
      folderItems.sort(getSorterByName())
    }

    return [
      ...globalItems,
      ...folderItems,
      ...items
    ]
  }
}
