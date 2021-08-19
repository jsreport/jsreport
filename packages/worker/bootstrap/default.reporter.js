const camelCase = require('camelcase')
const packageJson = require('../package.json')

const extensionsToDefine = Object.keys(packageJson.dependencies).filter((extName) => {
  return extName !== '@jsreport/jsreport-core' && (extName.startsWith('@jsreport/jsreport-') || extName.startsWith('jsreport-'))
})

for (const extensionName of extensionsToDefine) {
  let envVarName = 'extensions_'
  let extPath = '/app/'
  let simpleName
  let name

  if (extensionName.startsWith('@jsreport/jsreport-')) {
    name = extensionName.replace('@jsreport/jsreport-', '')
    simpleName = extensionName.replace('@jsreport/', '')
  } else {
    name = extensionName.replace('jsreport-', '')
    simpleName = extensionName
  }

  envVarName += camelCase(name)

  if (process.env.WORKSPACE_PACKAGES_BUILD != null) {
    extPath += `packages/${simpleName}`
  } else {
    extPath += `node_modules/${extensionName}`
  }

  process.env[envVarName] = extPath
}

module.exports = function defaultBootstrap () {

}
