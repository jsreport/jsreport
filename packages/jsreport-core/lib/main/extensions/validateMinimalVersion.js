const semver = require('semver')

function validateMinimalVersion (baseExtension, extension) {
  const generalErrorMsg = `${extension.name == null ? 'Anonymous extension' : `Extension "${extension.name}"`} is not compatible with "${baseExtension.name}" extension.`
  const getExtensionLabel = () => extension.name == null ? 'anonymous extension' : `"${extension.name}"`

  // this allows to validate pre-release versions too
  const normalizeVersionResults = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(baseExtension.version)

  if (normalizeVersionResults == null) {
    throw new Error(`Invalid format for version of "${baseExtension.name}" extension. Version found: "${baseExtension.version}"`)
  }

  let shouldValidateThatRequiresIsNotEmpty = true

  if (
    (extension.source === 'anonymous') ||
    (extension.source === 'local' && extension.pkgVersion == null)
  ) {
    shouldValidateThatRequiresIsNotEmpty = false
  }

  if (shouldValidateThatRequiresIsNotEmpty && extension.requires == null) {
    throw new Error(`${generalErrorMsg} Missing ".requires" information in ${getExtensionLabel(extension)} definition`)
  }

  const extensionRequires = extension.requires || {}
  const baseExtensionRequireInExtension = extensionRequires[baseExtension.name]

  if (baseExtensionRequireInExtension == null) {
    return
  }

  const minimalVersionFormatRegExp = /^(x{1}|\d+)\.(x{1}|\d+)\.(x{1}|\d+)$/

  if (!minimalVersionFormatRegExp.test(baseExtensionRequireInExtension)) {
    throw new Error(`${generalErrorMsg} Invalid format for minimal version of "${baseExtension.name}" extension. Minimal version found in ${getExtensionLabel(extension)} definition: "${baseExtensionRequireInExtension}"`)
  }

  const baseVersion = `${normalizeVersionResults[1]}.${normalizeVersionResults[2]}.${normalizeVersionResults[3]}`
  const targetSemVer = `>=${baseExtensionRequireInExtension}`

  const isValid = semver.satisfies(baseVersion, targetSemVer)

  if (!isValid) {
    throw new Error(`${generalErrorMsg} Minimal version spec "${baseExtensionRequireInExtension}" found in ${getExtensionLabel(extension)} does not match with version "${baseExtension.version}" of "${baseExtension.name}"`)
  }
}

module.exports = validateMinimalVersion
