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
    await this.runScripts(req, res, {
      method: 'beforeRender',
      getScripts: async () => {
        req.context.scriptsCache = await this._findScripts(req)

        this.reporter.logger.debug(`Found ${req.context.scriptsCache.length} script(s) to process`, req)

        for (const script of req.context.scriptsCache) {
          await this.reporter.runInSandbox({
            context: {},
            initFn: (getTopLevelFunctions) => {
              const topLevelFunctions = getTopLevelFunctions(script.content)

              if (topLevelFunctions.includes('beforeRender')) {
                script.shouldRunBeforeRender = true
              }
            },
            executionFn: () => {},
            userCode: ''
          }, req)
        }

        const beforeRenderScripts = req.context.scriptsCache.filter(s => s.shouldRunBeforeRender)

        if (beforeRenderScripts.length > 0) {
          this.reporter.logger.debug(`Processing ${beforeRenderScripts.length} beforeRender script function(s)`, req)
        }

        return req.context.scriptsCache.filter(s => s.shouldRunBeforeRender)
      }
    })
  }

  async handleAfterRender (req, res) {
    await this.runScripts(req, res, {
      method: 'afterRender',
      getScripts: () => {
        const afterRenderScripts = req.context.scriptsCache.filter(s => s.shouldRunAfterRender)

        if (afterRenderScripts.length > 0) {
          this.reporter.logger.debug(`Processing ${afterRenderScripts.length} afterRender script function(s)`, req)
        }

        return afterRenderScripts
      }
    })
  }

  async runScripts (req, res, { method, getScripts }) {
    const generalScriptsProfilerEvent = this.reporter.profiler.emit({
      type: 'operationStart',
      subtype: `scripts${method.charAt(0).toUpperCase() + method.slice(1)}`,
      name: `scripts ${method}`,
      group: `Scripts: ${method}`
    }, req, res)

    const scripts = await getScripts()

    for (const script of scripts) {
      const currentScriptProfilerEvent = this.reporter.profiler.emit({
        type: 'operationStart',
        subtype: 'script',
        name: `script: ${script.name || 'anonymous'}`
      }, req, res)

      await this._runScript(req, res, {
        script,
        method
      })

      this.reporter.profiler.emit({
        type: 'operationEnd',
        operationId: currentScriptProfilerEvent.operationId
      }, req, res)
    }

    if (generalScriptsProfilerEvent) {
      this.reporter.profiler.emit({
        type: 'operationEnd',
        operationId: generalScriptsProfilerEvent.operationId
      }, req, res)
    }
  }

  async _runScript (req, res, { script, method, onBeforeExecute = () => {}, onAfterExecute = () => {} }) {
    this.reporter.logger.debug(`Executing script ${(script.name || script.shortid || 'anonymous')} (${method})`, req)

    await this.reporter.beforeScriptListeners.fire({ script }, req, res)

    const scriptExecResult = await (require('./executeScript')(this.reporter, { script, method, onBeforeExecute }, req, res))

    if (scriptExecResult.error) {
      throw this.reporter.createError(scriptExecResult.error.message, {
        weak: true
      })
    }

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

    if (method === 'beforeRender') {
      req.data = scriptExecResult.req.data
      delete scriptExecResult.req.data
      merge(req, scriptExecResult.req)

      await res.parse(scriptExecResult.res)
    }

    if (method === 'afterRender') {
      await res.parse(scriptExecResult.res)

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

    let items = await Promise.all(req.template.scripts.map(async (script) => {
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

      const originalItems = await this.reporter.documentStore.collection('scripts').find(query, req)
      const items = originalItems.filter((s) => s.scope === 'template' || (s.scope == null && !s.isGlobal))

      if (items.length < 1) {
        // executing request to store without user to verify if the script exists or if
        // it is just not accessible for the current user
        const scriptResultFromLocal = await this.reporter.documentStore.collection('scripts').findAdmin(query, req)

        let error

        if (scriptResultFromLocal.length === 0) {
          error = this.reporter.createError(`Script not found (${
            (script.name || script.shortid)
          })`, {
            weak: true,
            statusCode: 404
          })
        } else {
          const attachedScript = scriptResultFromLocal[0]

          if (originalItems.length > 0) {
            // if we get to here it means that script was attached to template but the script
            // found has scope that is not expected to be run at the template level
            this.reporter.logger.warn(`Skipping execution of script attached to template (${
              (attachedScript.name || attachedScript.shortid)
            }) because its scope is inconsistent`, req)

            return null
          }

          error = this.reporter.createError(`User not authorized to read script (${
            (attachedScript.name || attachedScript.shortid)
          })`, {
            weak: true,
            statusCode: 403
          })
        }

        throw error
      }

      return items[0]
    }))

    items = items.filter((i) => i != null)

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

function merge (obj, obj2) {
  for (const key in obj2) {
    if (typeof obj2[key] === 'undefined') {
      continue
    }

    if (Buffer.isBuffer(obj2[key])) {
      obj[key] = Buffer.from(obj2[key])
    } else if (Object.prototype.toString.call(obj2[key]) === '[object Uint8Array]') {
      let newBuf = Buffer.from(obj2[key].buffer)

      if (obj2[key].byteLength !== obj2[key].buffer.byteLength) {
        newBuf = newBuf.slice(obj2[key].byteOffset, obj2[key].byteOffset + obj2[key].byteLength)
      }

      obj[key] = newBuf
    } else if (typeof obj2[key] !== 'object' || typeof obj[key] === 'undefined') {
      obj[key] = obj2[key]
    } else {
      merge(obj[key], obj2[key])
    }
  }
}
