const path = require('path')
const fsAsync = require('fs/promises')

module.exports = async (extension) => {
  const result = {
    source: 'anonymous'
  }

  if (extension.version != null || extension.source != null) {
    result.source = extension.source
    result.version = extension.version
    result.pkgVersion = extension.pkgVersion

    return result
  }

  if (extension.name == null) {
    return result
  }

  if (extension.directory == null) {
    result.source = 'local'
    result.version = 'local:inline'
    return result
  }

  try {
    const packageJsonContent = await fsAsync.readFile(path.join(extension.directory, 'package.json'))
    const packageJson = JSON.parse(packageJsonContent.toString())

    if (extension.directory.includes('node_modules') && packageJson.version != null) {
      result.source = 'npm'
      result.version = packageJson.version
      result.pkgVersion = packageJson.version
    } else if (packageJson.version != null) {
      result.source = 'local'
      result.version = `local:${extension.directory}:${packageJson.version}`
      result.pkgVersion = packageJson.version
    } else {
      result.source = 'local'
      result.version = `local:${extension.directory}`
    }
  } catch (e) {
    result.source = 'local'
    result.version = `local:${extension.directory}`
  }

  return result
}
