/* eslint-disable */
async function component (path, options) {
  let entity

  try {
    const jsreport = require('jsreport-proxy')

    if (!component.__cache || !component.__cache[path]) {
      if (path == null) {
        throw new Error('component helper requires path argument')
      }

      const resolvedCurrentDirectoryPath = await jsreport.currentDirectoryPath()
      const componentSearchResult = await jsreport.folders.resolveEntityFromPath(path, 'components', { currentPath: resolvedCurrentDirectoryPath })

      if (componentSearchResult == null) {
        throw new Error(`Component ${path} not found`)
      }

      component.__cache = component.__cache || {}
      component.__cache[path] = componentSearchResult.entity
    }

    entity = component.__cache[path]

    const isHandlebars = typeof arguments[arguments.length - 1].lookupProperty === 'function'
    const isJsRender = this.tmpl && this.tmpl && typeof this.tmpl.fn === 'function'

    let currentContext
    if (isHandlebars) {
      currentContext = this
    }

    if (isJsRender) {
      currentContext = this.data
    }

    return await jsreport.templatingEngines.evaluate({
      engine: entity.engine,
      content: entity.content,
      helpers: entity.helpers,
      data: currentContext
    }, {
      entity,
      entitySet: 'components'
    })
  } catch (e) {
    if (e.entity == null && entity != null) {
      e.message = `Error when evaluating templating engine for component ${path}\n${e.message}`

      e.entity = {
        shortid: entity.shortid,
        name: entity.name,
        content: entity.content
      }

      if (e.property !== 'content') {
        e.property = 'helpers'
      }
    }

    throw e
  }
}
