const util = require('util')
const asyncReplace = util.promisify(require('async-replace-with-limit'))
const Semaphore = require('semaphore-async-await').default
const { readAsset } = require('./assetsShared')
const imageTest = /\.(jpeg|jpg|gif|png|svg)$/
const fontTest = /\.(woff|ttf|otf|eot|woff2)$/
const fs = require('fs').promises
const path = require('path')

module.exports = (reporter, definition) => {
  reporter.assets = { options: definition.options }
  reporter.addRequestContextMetaConfig('evaluateAssetsCounter', { sandboxHidden: true })

  let assetHelpers

  reporter.beforeRenderListeners.insert({ after: 'scripts' }, definition.name, this, async (req, res) => {
    req.template.content = await evaluateAssets(reporter, definition, req.template.content, req)

    if (req.template.helpers && typeof req.template.helpers === 'string') {
      req.template.helpers = await evaluateAssets(reporter, definition, req.template.helpers, req)
    }
  })

  reporter.registerHelpersListeners.add(definition.name, () => {
    return assetHelpers
  })

  reporter.afterTemplatingEnginesExecutedListeners.add(definition.name, async (req, res) => {
    await evaluateAssets(reporter, definition, res, req)
  })

  reporter.initializeListeners.add(definition.name, async () => {
    assetHelpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()

    if (reporter.beforeScriptListeners) {
      reporter.beforeScriptListeners.add(definition.name, async function ({ script }, req) {
        script.content = await evaluateAssets(reporter, definition, script.content, req)
      })
    }
  })

  reporter.extendProxy((proxy, req, {
    runInSandbox,
    context,
    getTopLevelFunctions
  }) => {
    proxy.assets = {
      read: async (path, encoding, moduleMode = false) => {
        const r = await readAsset(reporter, definition, { id: null, name: path, encoding, moduleMode, currentDirectoryPath: proxy.currentDirectoryPath }, req)
        return r.content
      },

      evaluateShared: async () => {
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

        let globalAssetsHelpers = await reporter.documentStore.collection('assets').find({
          $or: [
            { isSharedHelper: true },
            { sharedHelpersScope: 'global' }
          ]
        }, req)

        globalAssetsHelpers = globalAssetsHelpers.filter((asset) => asset.sharedHelpersScope == null || asset.sharedHelpersScope === 'global')

        globalAssetsHelpers.sort(getSorterByName())

        const folderAssetsHelpers = []

        if (req.context.resolvedTemplate != null) {
          let currentEntity = req.context.resolvedTemplate
          const assetsHelpersByLevel = []

          do {
            const folderQuery = currentEntity.folder != null ? { shortid: currentEntity.folder.shortid } : null

            const assetsHelpers = await reporter.documentStore.collection('assets').find({
              sharedHelpersScope: 'folder',
              folder: folderQuery
            }, req)

            if (assetsHelpers.length > 0) {
              assetsHelpersByLevel.push([...assetsHelpers])
            }

            if (currentEntity.folder != null) {
              currentEntity = await reporter.documentStore.collection('folders').findOne({
                shortid: currentEntity.folder.shortid
              }, req)
            } else {
              currentEntity = null
            }
          } while (currentEntity != null)

          assetsHelpersByLevel.reverse()

          for (const currentAssetHelpers of assetsHelpersByLevel) {
            currentAssetHelpers.sort(getSorterByName())
            folderAssetsHelpers.push(...currentAssetHelpers)
          }
        } else {
          // if anonymous request just search for asset helpers with scope "folder" at the top level
          const folders = await reporter.documentStore.collection('assets').find({
            sharedHelpersScope: 'folder',
            folder: null
          }, req)

          folderAssetsHelpers.push(...folders)
          // sort alphabetically asc
          folderAssetsHelpers.sort(getSorterByName())
        }

        const sharedHelpersAssets = [
          ...globalAssetsHelpers,
          ...folderAssetsHelpers
        ]

        for (const a of sharedHelpersAssets) {
          const asset = await readAsset(reporter, definition, { id: a._id, name: null, encoding: 'utf8' }, req)
          const functionNames = getTopLevelFunctions(asset.content.toString())
          const userCode = `(async () => { ${asset.content.toString()};
            __topLevelFunctions = {...__topLevelFunctions, ${functionNames.map(h => `"${h}": ${h}`).join(',')}}
            })()`
          await runInSandbox(userCode, {
            filename: a.name,
            source: userCode,
            entitySet: 'assets',
            entity: {
              ...a,
              content: asset.content.toString()
            }
          })
        }
      },

      registerHelpers: async (path) => {
        const asset = await readAsset(reporter, definition, { id: null, name: path, encoding: 'utf8', currentDirectoryPath: proxy.currentDirectoryPath }, req)

        const functionNames = getTopLevelFunctions(asset.content.toString())
        const userCode = `(async () => { ${asset.content.toString()};
            __topLevelFunctions = {...__topLevelFunctions, ${functionNames.map(h => `"${h}": ${h}`).join(',')}}
            })()`
        await runInSandbox(userCode, {
          filename: asset.filename,
          source: userCode,
          entitySet: 'assets',
          entity: {
            ...asset.entity,
            content: asset.entity.content.toString()
          }
        })
      },

      require: async (path) => {
        const r = await readAsset(reporter, definition, { id: null, name: path, encoding: 'utf8', currentDirectoryPath: proxy.currentDirectoryPath }, req)

        const userCode = [
          `;(async () => { async function moduleWrap(exports, require, module, __filename, __dirname) { ${r.content} \n};\n`,
          `const m = { exports: { }};
          const r = await moduleWrap(m.exports, require, m);
          return m.exports;
          })()`
        ].join('')

        const result = await runInSandbox(userCode, {
          filename: path,
          source: userCode,
          entitySet: 'assets',
          entity: r.entity
        })

        return result
      }
    }
  })
}

async function evaluateAssets (reporter, definition, contentToReplace, req) {
  const target = {
    value: contentToReplace
  }

  if (typeof contentToReplace === 'string') {
    target.type = 'string'
  } else if (contentToReplace != null && contentToReplace.__isJsreportResponse__ === true) {
    target.type = 'streaming'
  } else {
    throw new Error('evaluateAssets received invalid contentToReplace')
  }

  req.context.evaluateAssetsCounter = req.context.evaluateAssetsCounter || 0
  req.context.evaluateAssetsCounter++

  async function processAssetCall (assetCall) {
    const assetName = ((assetCall.indexOf(' @') !== -1) ? assetCall.substring(0, assetCall.indexOf(' @')) : assetCall).trim()

    let encoding = 'utf8'
    if (assetCall.indexOf(' @') !== -1) {
      const paramRaw = (assetCall.replace(assetName, '').replace(' @', '')).trim()

      if (paramRaw.split('=').length !== 2) {
        throw reporter.createError('Wrong asset param specification, should be {#asset name @encoding=base64}', {
          statusCode: 400
        })
      }

      const paramName = paramRaw.split('=')[0]
      const paramValue = paramRaw.split('=')[1]

      if (paramName !== 'encoding') {
        throw reporter.createError(`Unsupported param ${paramName}`, {
          statusCode: 400
        })
      }

      if (paramValue !== 'base64' && paramValue !== 'utf8' && paramValue !== 'string' && paramValue !== 'link' && paramValue !== 'dataURI') {
        throw reporter.createError(`Unsupported asset encoding param value ${paramValue}, supported values are base64, utf8, link, dataURI and string`, {
          statusCode: 400
        })
      }

      if (paramValue === 'dataURI' && !isImage(assetName) && !isFont(assetName)) {
        throw reporter.createError('Asset encoded as dataURI needs to have file extension jpeg|jpg|gif|png|svg|woff|tff|otf|woff2|eot', {
          statusCode: 400
        })
      }

      encoding = paramValue
    }

    const res = await readAsset(reporter, definition, { id: null, name: assetName, encoding }, req)

    return {
      name: assetName,
      content: res.content
    }
  }

  async function evaluateNestedAssetsIfNeeded (assetsFound, content) {
    if (assetsFound.length > 0) {
      reporter.logger.debug(`Replaced assets ${JSON.stringify(assetsFound)}`, req)
    }

    if (assetsFound.length > 0 && getCompleteAssetCallRegexp().test(content) && req.context.evaluateAssetsCounter < 100) {
      return evaluateAssets(reporter, definition, content, req)
    }

    return content
  }

  if (target.type === 'string') {
    const replacedAssets = []

    const result = await asyncReplace(target.value, getCompleteAssetCallRegexp(), function stringConvert (str, p1, offset, s, done) {
      processAssetCall(p1).then((assetResult) => {
        replacedAssets.push(assetResult.name)
        done(null, assetResult.content)
      }).catch(done)
    })

    const finalResult = await evaluateNestedAssetsIfNeeded(replacedAssets, result)

    return finalResult
  }

  await target.value.output.save({
    transform: async (chunk) => {
      const chunkStr = chunk.toString()
      const result = {}
      const replacedAssets = []

      const matches = [...chunkStr.matchAll(getCompleteAssetCallRegexp())]

      if (matches.length === 0) {
        result.content = chunk
        result.concat = hasPartialAssetCall(chunkStr)

        return result
      }

      const matchesCount = matches.length
      const semaphore = new Semaphore(Infinity)
      const tasks = []
      const results = new Map()

      for (let idx = 0; idx < matchesCount; idx++) {
        const currentIdx = idx

        tasks.push(semaphore.execute(async () => {
          const match = matches[currentIdx]
          const left = chunkStr.slice(0, match.index)
          const right = chunkStr.slice(match.index + match[0].length)

          const assetCallResult = await processAssetCall(match[1])

          replacedAssets.push(assetCallResult.name)

          results.set(currentIdx, `${left}${assetCallResult.content}${right}`)
        }))
      }

      await Promise.all(tasks)

      const newContentParts = []

      for (let idx = 0; idx < matchesCount; idx++) {
        newContentParts.push(results.get(idx))
      }

      const newContent = await evaluateNestedAssetsIfNeeded(replacedAssets, newContentParts.join(''))

      result.content = Buffer.from(newContent)
      result.concat = hasPartialAssetCall(newContent)

      return result
    }
  })
}

function hasPartialAssetCall (str) {
  const partialMatch = str.match(getIncompleteAssetCallAtEndRegexp())
  let hasPartialCall = false

  if (partialMatch == null) {
    hasPartialCall = false
  } else {
    const assetPart = partialMatch[1]
    const namePart = partialMatch[2].length

    const checks = [
      () => assetPart.length === 0 && namePart === 0,
      () => {
        if (assetPart.length === 0) {
          return false
        }

        const completeAssetPart = '#asset '
        const containsComplete = assetPart.length === completeAssetPart.length

        if (containsComplete) {
          return true
        }

        const targetAssetPart = completeAssetPart.slice(0, partialMatch[1].length)

        return assetPart === targetAssetPart
      }
    ]

    hasPartialCall = checks.some((check) => check())
  }

  return hasPartialCall
}

function getCompleteAssetCallRegexp () {
  return /{#asset ([^{}]{0,500})}/g
}

function getIncompleteAssetCallAtEndRegexp () {
  return /{([#asset ]{0,7})([^{}]{0,500})$/
}

function isImage (name) {
  return name.match(imageTest) != null
}

function isFont (name) {
  return name.match(fontTest) != null
}
