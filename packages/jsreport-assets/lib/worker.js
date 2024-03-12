const util = require('util')
const asyncReplace = util.promisify(require('async-replace-with-limit'))
const { readAsset } = require('./assetsShared')
const test = /{#asset ([^{}]{0,500})}/g
const imageTest = /\.(jpeg|jpg|gif|png|svg)$/
const fontTest = /\.(woff|ttf|otf|eot|woff2)$/
const fs = require('fs').promises
const path = require('path')
const Cache = require('./cache')

function isImage (name) {
  return name.match(imageTest) != null
}
function isFont (name) {
  return name.match(fontTest) != null
}

async function evaluateAssets (reporter, definition, stringToReplace, req) {
  stringToReplace += ''
  req.context.evaluateAssetsCounter = req.context.evaluateAssetsCounter || 0
  req.context.evaluateAssetsCounter++

  const replacedAssets = []

  function convert (str, p1, offset, s, done) {
    const assetName = ((p1.indexOf(' @') !== -1) ? p1.substring(0, p1.indexOf(' @')) : p1).trim()

    let encoding = 'utf8'
    if (p1.indexOf(' @') !== -1) {
      const paramRaw = (p1.replace(assetName, '').replace(' @', '')).trim()

      if (paramRaw.split('=').length !== 2) {
        throw reporter.createError('Wrong asset param specification, should be {#asset name @encoding=base64}', {
          statusCode: 400
        })
      }

      const paramName = paramRaw.split('=')[0]
      const paramValue = paramRaw.split('=')[1]

      if (paramName !== 'encoding') {
        throw reporter.createError('Unsupported param ' + paramName, {
          statusCode: 400
        })
      }

      if (paramValue !== 'base64' && paramValue !== 'utf8' && paramValue !== 'string' && paramValue !== 'link' && paramValue !== 'dataURI') {
        throw reporter.createError('Unsupported asset encoding param value ' + paramValue + ', supported values are base64, utf8, link, dataURI and string', {
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

    readAsset(reporter, definition, { id: null, name: assetName, encoding }, req).then(function (res) {
      replacedAssets.push(assetName)
      done(null, res.content)
    }).catch(done)
  }

  const result = await asyncReplace(stringToReplace, test, convert)
  if (replacedAssets.length) {
    reporter.logger.debug('Replaced assets ' + JSON.stringify(replacedAssets), req)
  }

  if (test.test(result) && req.context.evaluateAssetsCounter < 100) {
    return evaluateAssets(reporter, definition, result, req)
  }

  return result
}

module.exports = (reporter, definition) => {
  reporter.assets = {
    options: definition.options,
    cache: Cache(reporter)
  }
  reporter.addRequestContextMetaConfig('evaluateAssetsCounter', { sandboxHidden: true })

  let assetHelpers

  reporter.beforeRenderListeners.insert({ after: 'scripts' }, definition.name, this, async (req, res) => {
    if (res.isInStreamingMode) {
      return
    }

    req.template.content = await evaluateAssets(reporter, definition, req.template.content, req)

    if (req.template.helpers && typeof req.template.helpers === 'string') {
      req.template.helpers = await evaluateAssets(reporter, definition, req.template.helpers, req)
    }
  })

  reporter.registerHelpersListeners.add(definition.name, () => {
    return assetHelpers
  })

  reporter.afterTemplatingEnginesExecutedListeners.add(definition.name, async (req, res) => {
    if (res.isInStreamingMode) {
      return
    }

    const result = await evaluateAssets(reporter, definition, res.content.toString(), req)
    await res.output.update(Buffer.from(result))
  })

  reporter.initializeListeners.add(definition.name, async () => {
    assetHelpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
    if (reporter.beforeScriptListeners) {
      reporter.beforeScriptListeners.add(definition.name, function ({ script }, req, res) {
        if (res.isInStreamingMode) {
          return
        }

        return evaluateAssets(reporter, definition, script.content, req).then(function (result) {
          script.content = result
        })
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
