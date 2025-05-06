const path = require('path')
const url = require('url')
const _ = require('lodash')
const crypto = require('crypto')
const fs = require('fs')
const fsP = require('fs/promises')
const serveStatic = require('serve-static')
const favicon = require('serve-favicon')
const { Diff2Html } = require('diff2html')
const compression = require('compression')
const ThemeManager = require('./themeManager')
const createTextSearch = require('./textSearch')
const distPath = path.join(__dirname, '../static/dist')
const ms = require('ms')
const { imageSize } = require('image-size')

module.exports = (reporter, definition) => {
  const diff2htmlStyle = fs.readFileSync(path.join(__dirname, '../static/diff.css')).toString()
  const mainCssFilename = findMainCssFilename()
  const extensionsJsChunkName = findExtensionsJsChunkName()
  const themeManager = ThemeManager(process.env.NODE_ENV !== 'jsreport-development', reporter.logger.warn)

  reporter.studio = {
    getAllThemes: themeManager.getAllThemes,
    getAllEditorThemes: themeManager.getAllEditorThemes,
    getAvailableThemeVariables: themeManager.getAvailableThemeVariables,
    getCurrentThemeVars: themeManager.getCurrentThemeVars,
    registerTheme: themeManager.registerTheme,
    registerThemeVariables: themeManager.registerThemeVariables
  }

  reporter.studio.registerThemeVariables(path.join(__dirname, './themeVarsDefinition.json'))

  reporter.studio.registerTheme({
    name: 'light',
    // the light theme is equal to the default values of variables, so no need to register a json file here
    variablesPath: null,
    previewColor: '#F6F6F6',
    editorTheme: 'chrome'
  })

  const titleTemplateSettings = {
    variable: 'jsreport',
    // disabling escape
    escape: null,
    // making evaluate and interpolate the same, so basic javascript (like ternary conditions) works in the interpolation
    evaluate: /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,
    // only match es6 string templates
    interpolate: /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,
    imports: {
      _: null
    }
  }

  const faviconInfo = { default: true }

  if (definition.options.favicon != null && definition.options.favicon !== '') {
    faviconInfo.default = false
    faviconInfo.path = path.resolve(reporter.options.rootDirectory, definition.options.favicon)
  } else {
    faviconInfo.path = path.join(__dirname, '../static/favicon.ico')
  }

  const validFaviconExtensions = ['.ico']

  faviconInfo.type = path.extname(faviconInfo.path)

  if (faviconInfo.type === '.' || faviconInfo.type === '' || !validFaviconExtensions.includes(faviconInfo.type)) {
    throw reporter.createError(`Invalid favicon file, the path must have a valid extension. valid: ${validFaviconExtensions.join(', ')}`)
  }

  faviconInfo.type = faviconInfo.type.slice(1)

  faviconInfo.mimeType = serveStatic.mime.lookup(faviconInfo.type)

  if (!faviconInfo.mimeType) {
    throw reporter.createError(`Mime type not found for favicon file, the path must have a valid extension. valid: ${validFaviconExtensions.join(', ')}`)
  }

  try {
    faviconInfo.content = fs.readFileSync(faviconInfo.path)
  } catch (error) {
    throw reporter.createError(`Unable to read favicon file at ${faviconInfo.path}`, {
      original: error
    })
  }

  try {
    const hasSmallDimension = (d) => d.width === 16 && d.height === 16
    const hasLargeDimension = (d) => d.width === 32 && d.height === 32

    const dimensions = imageSize(faviconInfo.content)
    let dimension

    if (dimensions.type === 'ico') {
      let smallIcon
      let largeIcon
      let otherMaxIcon

      for (const current of dimensions.images) {
        if (hasSmallDimension(current)) {
          smallIcon = current
        } else if (hasLargeDimension(current)) {
          largeIcon = current
        } else {
          if (otherMaxIcon == null) {
            otherMaxIcon = current
          } else if (current.width > otherMaxIcon.width) {
            otherMaxIcon = current
          }
        }
      }

      if (largeIcon == null && smallIcon == null) {
        dimension = otherMaxIcon
      } else {
        dimension = largeIcon ?? smallIcon
      }
    } else {
      dimension = dimensions
    }

    if (!hasSmallDimension(dimension) && !hasLargeDimension(dimension)) {
      reporter.logger.warn(`The image at ${faviconInfo.path} has dimensions different than the recommended for a favicon file. We are still going to use this file for the favicon but it is recommend to use an image with 16x16 or 32x32 to avoid issues with browsers`)
    }

    faviconInfo.size = dimension
  } catch {}

  const titleTemplate = _.template(definition.options.title, titleTemplateSettings)
  // eslint-disable-next-line no-template-curly-in-string
  const defaultTitleTemplate = _.template(definition.optionsSchema.extensions.studio.properties.title.default, titleTemplateSettings)

  let customLogoPathOrBuffer
  let customCssFile
  let customCssContent
  let compiler
  let clientStudioExtensionsJsContent
  let clientStudioExtensionsCssContent

  const serverStartupHash = crypto.randomBytes(10).toString('hex')

  reporter.on('after-authentication-express-routes', () => reporter.express.app.get('/', redirectOrSendIndex))

  reporter.on('after-express-static-configure', () => {
    if (!reporter.authentication) {
      return reporter.express.app.get('/', redirectOrSendIndex)
    }
  })

  reporter.on('before-express-configure', () => {
    reporter.express.app.use('/api/report', (req, res, next) => {
      res.cookie('render-complete', true)
      next()
    })
  })

  reporter.on('express-configure', () => {
    const extsInNormalMode = []
    const textSearch = createTextSearch(reporter)

    if (process.env.NODE_ENV !== 'jsreport-development') {
      const webpackJsWrap = fs.readFileSync(path.join(distPath, extensionsJsChunkName), 'utf8')

      const webpackExtensionsJs = webpackJsWrap.replace('$extensionsHere', () => {
        return reporter.extensionsManager.extensions.map((e) => {
          try {
            return fs.readFileSync(path.join(e.directory, 'studio/main.js'))
          } catch (e) {
            return ''
          }
        }).join('\n')
      })

      const webpackExtensionsCss = reporter.extensionsManager.extensions.map((e) => {
        try {
          return fs.readFileSync(path.join(e.directory, 'studio/main.css'))
        } catch (e) {
          return ''
        }
      }).join('\n')

      clientStudioExtensionsJsContent = webpackExtensionsJs
      clientStudioExtensionsCssContent = webpackExtensionsCss
    } else {
      const extsConfiguredInDevMode = process.env.JSREPORT_CURRENT_EXTENSION != null ? [process.env.JSREPORT_CURRENT_EXTENSION] : []

      if (definition.options.extensionsInDevMode != null) {
        let extensionsDefined = []

        if (Array.isArray(definition.options.extensionsInDevMode)) {
          extensionsDefined = [...definition.options.extensionsInDevMode]
        } else if (typeof definition.options.extensionsInDevMode === 'string') {
          extensionsDefined = [definition.options.extensionsInDevMode]
        }

        extensionsDefined.forEach((ext) => {
          if (ext !== '' && !extsConfiguredInDevMode.includes(ext)) {
            extsConfiguredInDevMode.push(ext)
          }
        })
      }

      if (extsConfiguredInDevMode.length > 0) {
        reporter.logger.debug(`studio extensions configured in dev mode: ${extsConfiguredInDevMode.join(', ')}`)
      } else {
        reporter.logger.debug('all studio extensions are configured in dev mode')
      }

      fs.writeFileSync(path.join(__dirname, '../src/extensions_dev.js'), reporter.extensionsManager.extensions.map((e) => {
        const shouldUseMainEntry = extsConfiguredInDevMode.length > 0 && !extsConfiguredInDevMode.includes(e.name)

        try {
          fs.statSync(path.join(e.directory, '/studio/main_dev.js'))

          const extensionPath = shouldUseMainEntry ? path.join(e.directory, '/studio/main.js') : path.join(e.directory, '/studio/main_dev.js')

          if (shouldUseMainEntry) {
            extsInNormalMode.push(e)
          }

          return `import '${path.relative(path.join(__dirname, '../src'), extensionPath).replace(/\\/g, '/')}'`
        } catch (e) {
          return ''
        }
      }).join('\n'))

      fs.writeFileSync(path.join(__dirname, '../src/extensions_dev.css'), reporter.extensionsManager.extensions.map((e) => {
        try {
          const extensionPath = path.join(e.directory, '/studio/main.css')

          fs.statSync(extensionPath)

          let cssImport = `@import '${path.relative(path.join(__dirname, '../src'), extensionPath).replace(/\\/g, '/')}';`

          // we enable the static import when all extensions are in dev mode or when the
          // specific extension is in dev mode, if it is not enabled then the studio/main.css
          // of extension is not imported but there can be still .css files imported from the
          // .js files of extension.
          // we do this to avoid duplicating css when in dev mode
          // (the css from studio/main.css and the css imported from .js files of extension)
          const enabled = extsConfiguredInDevMode.length > 0 && !extsConfiguredInDevMode.includes(e.name)

          if (!enabled) {
            cssImport = `/* DISABLED BECAUSE ${e.name} EXTENSION IS IN DEV MODE */\n/* ${cssImport} */`
          }

          return cssImport
        } catch (e) {
          return ''
        }
      }).join('\n'))
    }

    const app = reporter.express.app

    app.use(compression())
    app.use(favicon(faviconInfo.content))

    // we put the route before webpack dev middleware to get the chance to do our own handling
    app.get(`/studio/assets/${mainCssFilename}`, async (req, res, next) => {
      try {
        const themeCss = await themeManager.compileTheme(
          definition.options.theme.name,
          readMainCssContent,
          definition.options.theme.variables
        )

        res.type('css').send(themeCss)
      } catch (e) {
        next(e)
      }
    })

    if (process.env.NODE_ENV === 'jsreport-development') {
      const webpack = require('@jsreport/studio-dev').deps.webpack

      const webpackConfig = require('../webpack/dev.config')(
        reporter.extensionsManager.extensions,
        extsInNormalMode
      )

      compiler = webpack(webpackConfig)

      const statsOpts = definition.options.webpackStatsInDevMode || {}

      if (statsOpts.colors == null) {
        statsOpts.colors = true
      }

      if (statsOpts.chunks == null) {
        statsOpts.chunks = false
      }

      if (statsOpts.modules == null) {
        statsOpts.modules = false
      }

      if (statsOpts.assetsSpace == null) {
        statsOpts.assetsSpace = Infinity
      }

      if (statsOpts.modulesSpace == null) {
        statsOpts.modulesSpace = Infinity
      }

      if (statsOpts.chunkModulesSpace == null) {
        statsOpts.chunkModulesSpace = Infinity
      }

      reporter.express.app.use(require('webpack-dev-middleware')(compiler, {
        publicPath: '/studio/assets/',
        stats: statsOpts
      }))

      reporter.express.app.use(require('webpack-hot-middleware')(compiler))
    }

    if (extensionsJsChunkName != null) {
      app.get(`/studio/assets/${extensionsJsChunkName}`, (req, res) => {
        res.set('Content-Type', 'application/javascript')
        res.send(clientStudioExtensionsJsContent)
      })
    }

    app.get('/studio/assets/alternativeTheme.css', async (req, res, next) => {
      const themeName = req.query.name

      if (!themeName) {
        return res.status(400).end('Theme name was not specified in query string')
      }

      if (themeManager.getTheme(themeName) == null) {
        return res.status(404).end(`Theme "${themeName}" does not exists`)
      }

      try {
        const themeCss = await themeManager.compileTheme(
          themeName,
          readMainCssContent,
          definition.options.theme.variables
        )

        res.type('css').send(themeCss)
      } catch (e) {
        next(e)
      }
    })

    app.get('/studio/assets/customCss.css', async (req, res, next) => {
      const theme = req.query.theme

      if (customCssContent == null && customCssFile == null) {
        return res.status(404).end('Custom css was not configured, use "extensions.studio.theme.customCss.content" or "extensions.studio.theme.customCss.path" if you want to include custom css')
      }

      if (theme == null) {
        return res.status(400).end('Theme name was not specified')
      }

      if (themeManager.getTheme(theme) == null) {
        return res.status(404).end(`Theme "${theme}" does not exists`)
      }

      try {
        const cssContent = await themeManager.compileCustomCss(theme, async function readCustomCssContent () {
          let content

          if (customCssContent != null) {
            content = customCssContent
          } else {
            content = (await fsP.readFile(customCssFile)).toString()
          }

          return content
        }, definition.options.theme.variables)

        res.type('css').send(cssContent)
      } catch (e) {
        next(e)
      }
    })

    app.get('/studio/assets/custom-logo', (req, res, next) => {
      if (!customLogoPathOrBuffer) {
        return res.status(404).end('Custom logo for studio was not configured, use "extensions.studio.theme.logo.base64" or "extensions.studio.theme.logo.path" option if you want to customize it')
      }

      if (typeof customLogoPathOrBuffer === 'string') {
        res.sendFile(customLogoPathOrBuffer, (err) => {
          if (err) {
            next(err)
          }
        })
      } else {
        res.type(customLogoPathOrBuffer.type).send(customLogoPathOrBuffer.content)
      }
    })

    app.use('/studio/assets', serveStatic(distPath))

    app.get('/studio/text-search-docProps', (req, res, next) => {
      res.status(200).json(textSearch.entitySetsForTextSearch.map((item) => ({
        entitySet: item.entitySet,
        documentProps: item.documentProps.map((dp) => {
          const prop = {
            name: dp.name
          }

          if (dp.def.document.main === true) {
            prop.main = true
          }

          return prop
        })
      })))
    })

    app.get('/studio/text-search', async (req, res, next) => {
      const searchAC = new AbortController()

      const handleRequestAbort = () => {
        searchAC.abort(new Error('Search aborted'))
      }

      try {
        req.socket.once('close', handleRequestAbort)

        const searchTerm = req.query.text

        if (searchTerm == null || searchTerm === '') {
          return res.status(400).end('No search term specified')
        }

        const currentRequest = reporter.Request(req)

        const { matchesCount, entitiesCount, results } = await textSearch(reporter, currentRequest, searchTerm, {
          step: 100,
          signal: searchAC.signal
        })

        req.socket.removeListener('close', handleRequestAbort)

        res.status(200).json({
          matchesCount,
          entitiesCount,
          results
        })
      } catch (error) {
        req.socket.removeListener('close', handleRequestAbort)

        if (searchAC.signal.aborted) {
          // we just want to end the request, it was closed anyway at this point
          return res.end()
        }

        next(error)
      }
    })

    app.post('/studio/hierarchyMove', async (req, res) => {
      const source = req.body.source
      const target = req.body.target
      const shouldCopy = req.body.copy === true
      const shouldReplace = req.body.replace === true

      try {
        if (!source || !target) {
          const missing = !source ? 'source' : 'target'
          throw new Error(`No "${missing}" specified in payload`)
        }

        await reporter.documentStore.beginTransaction(req)

        let updatedItems

        try {
          updatedItems = await reporter.folders.move({
            source,
            target,
            shouldCopy,
            shouldReplace
          }, req)

          await reporter.documentStore.commitTransaction(req)
        } catch (e) {
          await reporter.documentStore.rollbackTransaction(req)
          throw e
        }

        /* eslint-disable-next-line */
        for (const e of updatedItems) {
          const doc = await reporter.documentStore.collection(e.__entitySet).serializeProperties([e])
          Object.assign(e, doc[0])
        }

        res.status(200).json({
          items: updatedItems
        })
      } catch (e) {
        const errorRes = { message: e.message }

        if (e.code === 'DUPLICATED_ENTITY') {
          errorRes.code = e.code

          errorRes.existingEntity = {
            _id: e.existingEntity._id,
            name: e.existingEntity.name
          }

          errorRes.existingEntityEntitySet = e.existingEntityEntitySet

          if (e.existingEntityEntitySet === 'folders') {
            errorRes.message = `${errorRes.message} The existing entity is a folder and replacing a folder is not allowed, to be able to copy/move the entity you need to rename one of the two conflicting entities first.`
          }
        }

        res.status(400).json(errorRes)
      }
    })

    app.post('/studio/diff-html', (req, res, next) => {
      const style = `<style>${diff2htmlStyle}</style>`
      const diff = Diff2Html.getPrettyHtml(req.body.patch, { inputFormat: 'diff', showFiles: false, matching: 'lines' })
      res.send(`<!DOCTYPE html><html><head>${style}</head><body>${diff}</body></html>`)
    })

    app.post('/studio/validate-entity-name', async (req, res) => {
      const entitySet = req.body.entitySet
      const entityId = req.body._id
      const entityName = req.body.name
      const folderShortid = req.body.folderShortid

      try {
        if (!entitySet) {
          throw new Error('entitySet was not specified in request body')
        }

        const hasNameDef = reporter.documentStore.model.entitySets[entitySet].entityTypeDef.name != null

        if (hasNameDef) {
          await reporter.checkValidEntityName(entitySet, {
            _id: entityId,
            name: entityName,
            folder: folderShortid != null ? { shortid: folderShortid } : null
          }, req)
        }

        res.status(200).end()
      } catch (e) {
        res.status(400).end(e.message)
      }
    })

    app.get('/studio/*', sendIndex)
  })

  reporter.documentStore.on('after-init', () => {
    const documentStore = reporter.documentStore

    /* eslint-disable-next-line */
    for (const key in documentStore.collections) {
      const col = reporter.documentStore.collections[key]
      const entitySet = documentStore.model.entitySets[col.entitySet]

      const entityTypeName = entitySet.entityType.replace(documentStore.model.namespace + '.', '')
      const entityType = documentStore.model.entityTypes[entityTypeName]

      if (
        entityType.modificationDate != null &&
        entityType.modificationDate.type === 'Edm.DateTimeOffset'
      ) {
        col.beforeUpdateListeners.insert(0, 'studio-concurrent-save-check', async (q, u, o, req) => {
          if (!u.$set || !u.$set.modificationDate || !req) {
            return
          }

          if (
            !req.context ||
            !req.context.http ||
            !req.context.http.headers ||
            (
              req.context.http.headers['x-validate-concurrent-update'] !== 'true' &&
              req.context.http.headers['x-validate-concurrent-update'] !== true
            )
          ) {
            return
          }

          let lastModificationDate = u.$set.modificationDate

          if (typeof lastModificationDate === 'string') {
            lastModificationDate = new Date(lastModificationDate)

            if (lastModificationDate.toString() === 'Invalid Date') {
              return
            }
          }

          if (typeof lastModificationDate.getTime !== 'function') {
            return
          }

          if (q._id == null) {
            return
          }

          const entity = await col.findOne(q, req)

          if (entity) {
            const currentModificationDate = entity.modificationDate

            if (currentModificationDate.getTime() !== lastModificationDate.getTime()) {
              throw reporter.createError(`Entity (_id: ${entity._id}) was modified previously by another source`, {
                status: 400,
                code: 'CONCURRENT_UPDATE_INVALID',
                weak: true
              })
            }
          }
        })
      }
    }

    initThemeOptions()
  })

  reporter.initializeListeners.insert({ before: 'express' }, 'studio', async () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        customLogo: customLogoPathOrBuffer != null,
        theme: definition.options.theme.name,
        editorTheme: definition.options.theme.editorThemeName,
        availableThemes: themeManager.getAllThemes().reduce((acu, themeName) => {
          const themeValue = themeManager.getTheme(themeName)

          acu[themeName] = {
            previewColor: themeValue.previewColor,
            editorTheme: themeValue.editorTheme
          }

          return acu
        }, {}),
        availableEditorThemes: themeManager.getAllEditorThemes().reduce((acu, editorThemeName) => {
          const editorThemeValue = themeManager.getEditorTheme(editorThemeName)

          acu[editorThemeName] = editorThemeValue
          return acu
        }, {}),
        serverStartupHash,
        startupPage: definition.options.startupPage,
        entityTreeOrder: definition.options.entityTreeOrder,
        entityTreeGroupMode: definition.options.entityTreeGroupMode,
        linkButtonVisibility: definition.options.linkButtonVisibility,
        profiler: {
          defaultMode: reporter.options.profiler.defaultMode,
          fullModeDurationStr: ms(reporter.options.profiler.fullModeDuration)
        }
      })
    }
  })

  function findMainCssFilename () {
    if (process.env.NODE_ENV === 'jsreport-development') {
      return 'main.dev.css'
    } else {
      const staticFiles = fs.readdirSync(distPath)

      return staticFiles.find((fileName) => /main\.[^.]+.css/.test(fileName))
    }
  }

  function findExtensionsJsChunkName () {
    if (process.env.NODE_ENV === 'jsreport-development') {
      return
    }

    const staticFiles = fs.readdirSync(distPath)

    return staticFiles.find((fileName) => /studio-extensions\.client\.[^.]+.js/.test(fileName))
  }

  async function readMainCssContent () {
    const mainCssPath = path.join(__dirname, `../static/dist/${mainCssFilename}`)
    let readFile

    if (compiler) {
      readFile = compiler.outputFileSystem.readFile.bind(compiler.outputFileSystem)
    } else {
      readFile = fs.readFile.bind(fs)
    }

    let cssContent = await new Promise((resolve, reject) => {
      readFile(mainCssPath, 'utf8', (err, content) => {
        if (err) {
          return reject(err)
        }

        resolve(content)
      })
    })

    if (clientStudioExtensionsCssContent) {
      cssContent = `${cssContent}\n\n${clientStudioExtensionsCssContent}`
    }

    return cssContent
  }

  function sendIndex (req, res, next) {
    const indexHtml = path.join(distPath, 'index.html')

    function send (err, content) {
      if (err) {
        return next(err)
      }

      let title

      try {
        title = titleTemplate(reporter)
      } catch (e) {
        // in case of error, add a warn log and use default template
        reporter.logger.warn(`Error when trying to generate studio title with template "${
          definition.options.title
        }". ${e.message}. the studio title is falling back to default template "${
          definition.optionsSchema.extensions.studio.properties.title.default
        }"`)

        title = defaultTitleTemplate(reporter)
      }

      let faviconLink = `<link rel="icon" type="${faviconInfo.mimeType}"`

      if (faviconInfo.size != null) {
        faviconLink += ` sizes="${faviconInfo.size.width}x${faviconInfo.size.height}"`
      }

      faviconLink += ` href="${reporter.options.appPath}favicon.${faviconInfo.type}?${serverStartupHash}">`

      content = content.replace('$serverStartupHash', serverStartupHash)
      content = content.replace('$jsreportTitle', req.context.htmlTitle || title)
      content = content.replace('$jsreportFaviconLink', faviconLink)
      content = content.replace('$defaultTheme', definition.options.theme.name)
      content = content.replace(/client\.[^.]+.js/, (match) => `${reporter.options.appPath}studio/assets/${match}`)
      content = content.replace(/main\.[^.]+.css/, (match) => `${reporter.options.appPath}studio/assets/${match}`)
      content = content.replace('$customCssFiles', (customCssFile != null || customCssContent != null)
        ? `<link href="${reporter.options.appPath}studio/assets/customCss.css?${serverStartupHash}&theme=${definition.options.theme.name}" data-jsreport-studio-custom-css="true" rel="stylesheet">`
        : '')

      res.send(content)
    }

    function tryRead () {
      compiler.outputFileSystem.readFile(indexHtml, 'utf8', (err, content) => {
        if (err) {
          return setTimeout(tryRead, 1000)
        }

        send(null, content)
      })
    }

    if (process.env.NODE_ENV === 'jsreport-development') {
      tryRead()
    } else {
      fs.readFile(indexHtml, 'utf8', send)
    }
  }

  function redirectOrSendIndex (req, res, next) {
    // eslint-disable-next-line
    const reqUrl = url.parse(req.originalUrl)
    if (reqUrl.pathname[reqUrl.pathname.length - 1] !== '/') {
      return res.redirect(reqUrl.pathname + '/' + (reqUrl.search || ''))
    }

    sendIndex(req, res, next)
  }

  function initThemeOptions () {
    reporter.logger.debug(`studio default theme is: ${definition.options.theme.name}`)

    if (definition.options.theme.editorThemeName == null) {
      definition.options.theme.editorThemeName = themeManager.getTheme(definition.options.theme.name).editorTheme
    } else {
      reporter.logger.debug(`studio is using editor theme: ${definition.options.theme.editorThemeName}`)
    }

    if (definition.options.theme.logo.base64 != null) {
      if (
        definition.options.theme.logo.base64.type == null ||
        definition.options.theme.logo.base64.content == null
      ) {
        throw reporter.createError('"extensions.studio.theme.logo.base64.type" and "extensions.studio.theme.logo.base64.content" are required when specifying "extensions.studio.theme.logo.base64"')
      }

      customLogoPathOrBuffer = {
        type: definition.options.theme.logo.base64.type,
        content: Buffer.from(definition.options.theme.logo.base64.content, 'base64')
      }
      reporter.logger.debug('studio is using custom logo from base64 source')
    } else if (definition.options.theme.logo.path != null) {
      customLogoPathOrBuffer = path.resolve(reporter.options.rootDirectory, definition.options.theme.logo.path)
      reporter.logger.debug(`studio is using custom logo at: ${customLogoPathOrBuffer}`)
    }

    if (definition.options.theme.customCss.content != null) {
      customCssContent = definition.options.theme.customCss.content
      reporter.logger.debug('studio will include custom css style from raw string')
    } else if (definition.options.theme.customCss.path != null) {
      customCssFile = path.resolve(reporter.options.rootDirectory, definition.options.theme.customCss.path)
      reporter.logger.debug(`studio will include custom css style from: ${customCssFile}`)
    }
  }
}
