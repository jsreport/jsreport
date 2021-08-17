const Promise = require('bluebird')
const asyncReplace = Promise.promisify(require('async-replace'))
const { readAsset } = require('./assetsShared')
const test = /{#asset ([^{}]{0,500})}/g
const imageTest = /\.(jpeg|jpg|gif|png|svg)$/
const fontTest = /\.(woff|ttf|otf|eot|woff2)$/
const fs = require('fs').promises
const path = require('path')

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
    const assetName = (p1.indexOf(' @') !== -1) ? p1.substring(0, p1.indexOf(' @')) : p1

    let encoding = 'utf8'
    if (p1.indexOf(' @') !== -1) {
      const paramRaw = p1.replace(assetName, '').replace(' @', '')

      if (paramRaw.split('=').length !== 2) {
        throw new Error('Wrong asset param specification, should be {#asset name @encoding=base64}')
      }

      const paramName = paramRaw.split('=')[0]
      const paramValue = paramRaw.split('=')[1]

      if (paramName !== 'encoding') {
        throw new Error('Unsupported param ' + paramName)
      }

      if (paramValue !== 'base64' && paramValue !== 'utf8' && paramValue !== 'string' && paramValue !== 'link' && paramValue !== 'dataURI') {
        throw new Error('Unsupported asset encoding param value ' + paramValue + ', supported values are base64, utf8, link, dataURI and string')
      }

      if (paramValue === 'dataURI' && !isImage(assetName) && !isFont(assetName)) {
        throw new Error('Asset encoded as dataURI needs to have file extension jpeg|jpg|gif|png|svg|woff|tff|otf|woff2|eot')
      }

      encoding = paramValue
    }

    readAsset(reporter, definition, null, assetName, encoding, req).then(function (res) {
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
  reporter.assets = { options: definition.options }
  reporter.addRequestContextMetaConfig('evaluateAssetsCounter', { sandboxHidden: true })

  let assetHelpers

  reporter.beforeRenderListeners.insert({ after: 'scripts' }, definition.name, this, async (req, res) => {
    req.context.systemHelpers += assetHelpers + '\n'

    req.template.content = await evaluateAssets(reporter, definition, req.template.content, req)

    if (req.template.helpers && typeof req.template.helpers === 'string') {
      req.template.helpers = await evaluateAssets(reporter, definition, req.template.helpers, req)
    }
  })

  reporter.afterTemplatingEnginesExecutedListeners.add('assets', async (req, res) => {
    const result = await evaluateAssets(reporter, definition, res.content.toString(), req)
    res.content = Buffer.from(result)
  })

  reporter.initializeListeners.add('assets', async () => {
    assetHelpers = (await fs.readFile(path.join(__dirname, '../static/helpers.js'))).toString()
    if (reporter.beforeScriptListeners) {
      reporter.beforeScriptListeners.add('assets', function ({ script }, req) {
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
      read: async (path, encoding) => {
        const r = await readAsset(reporter, definition, null, path, encoding, req)
        return r.content
      },

      evaluateShared: async () => {
        const sharedHelpersAssets = await reporter.documentStore.collection('assets').find({ isSharedHelper: true }, req)
        for (const a of sharedHelpersAssets) {
          const asset = await readAsset(reporter, definition, a._id, null, 'utf8', req)
          const functionNames = getTopLevelFunctions(asset.content.toString())
          const userCode = `(() => { ${asset.content.toString()};
            __topLevelFunctions = {...__topLevelFunctions, ${functionNames.map(h => `"${h}": ${h}`).join(',')}}
            })()`
          await runInSandbox(userCode, {
            filename: a.name,
            source: userCode,
            entity: {
              ...a,
              content: a.content.toString()
            }
          })
        }
      },

      registerHelpers: async (path) => {
        const asset = await readAsset(reporter, definition, null, path, 'utf8', req)

        const functionNames = getTopLevelFunctions(asset.content.toString())
        const userCode = `(() => { ${asset.content.toString()};
            __topLevelFunctions = {...__topLevelFunctions, ${functionNames.map(h => `"${h}": ${h}`).join(',')}}
            })()`
        await runInSandbox(userCode, {
          filename: asset.filename,
          source: userCode,
          entity: {
            ...asset.entity,
            content: asset.entity.content.toString()
          }
        })
      },

      require: async (path) => {
        const r = await readAsset(reporter, definition, null, path, 'utf8', req)

        const userCode = [
          `;(() => { function moduleWrap(exports, require, module, __filename, __dirname) { ${r.content} \n};\n`,
          `const m = { exports: { }};
          const r = moduleWrap(m.exports, require, m);
          return m.exports;
          })()`
        ].join('')

        const result = await runInSandbox(userCode, {
          filename: path,
          source: userCode,
          entity: r.entity
        })

        return result
      }
    }
  })
}
