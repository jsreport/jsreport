/*!
 * Copyright(c) 2014 Jan Blaha
 */

var extend = require('node.extend')
var fs = require('fs')
var path = require('path')
var core = require('jsreport-core')
var _ = require('underscore')
var initHandler = require('jsreport-cli/lib/commands/init').handler
var repairHandler = require('jsreport-cli/lib/commands/repair').handler
var packageJson = require('./package.json')
var main = require('./lib/main')

var renderDefaults = {
  connectionString: {name: 'memory'},
  dataDirectory: path.join(__dirname, '../../', 'data'),
  blobStorage: 'inMemory',
  cacheAvailableExtensions: true,
  logger: {providerName: 'dummy'},
  rootDirectory: path.join(__dirname, '../../'),
  extensions: ['templates', 'data', 'phantom-pdf', 'jsrender', 'handlebars', 'fop-pdf', 'html-to-xlsx', 'jsrender', 'scripts', 'text', 'xlsx', 'assets']
}

function ensureTempFolder () {
  if (renderDefaults.tempDirectory) {
    return
  }

  renderDefaults.tempDirectory = path.join(require('os').tmpdir(), 'jsreport')

  try {
    fs.mkdirSync(renderDefaults.tempDirectory)
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
  }
}

function render (req) {
  if (_.isString(req)) {
    req = {
      template: {content: req, engine: 'handlebars', recipe: 'phantom-pdf'}
    }
  }

  if (!core.Reporter.instance) {
    ensureTempFolder()
    renderDefaults.parentModuleDirectory = renderDefaults.parentModuleDirectory || path.dirname(module.parent.filename)

    return main(renderDefaults).init().then(function () {
      return core.Reporter.instance.render(req)
    })
  }

  return core.Reporter.instance.render(req)
}

function extendDefaults (config) {
  return extend(true, renderDefaults, config)
}

if (require.main === module) {
  require('commander')
    .version(packageJson.version)
    .usage('[options]')
    .option('-i, --init', 'Initialize server.js, config.json and package.json of application and starts it. For windows also installs service.', function () {
      initHandler({
        context: {
          cwd: process.cwd()
        }
      })
      .catch(function (error) {
        console.error(error)
      })
    })
    .option('-r, --repair', 'Recreate server.js, config.json and package.json of application to default.', function () {
      repairHandler({
        context: {
          cwd: process.cwd()
        }
      })
      .catch(function (error) {
        console.error(error)
      })
    })
    .parse(process.argv)
} else {
  module.exports = function (options) {
    options = options || {}
    options.parentModuleDirectory = path.dirname(module.parent.filename)
    return main(options)
  }

  module.exports.Reporter = core.Reporter
  module.exports.renderDefaults = renderDefaults
  module.exports.render = render
  module.exports.extendDefaults = extendDefaults
  module.exports.reporter = core.Reporter.instance
  module.exports.core = core
}
