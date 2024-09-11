const fs = require('fs/promises')
const path = require('path')
const minimatch = require('minimatch')
const jsStringEscape = require('js-string-escape')
const mime = require('mime')
const stripBom = require('strip-bom-buf')

module.exports.readFile = readFile
module.exports.linkPath = linkPath
module.exports.readAsset = cachedReadAsset
module.exports.isAssetPathValid = isAssetPathValid

async function cachedReadAsset (reporter, definition, { id, name, encoding, currentDirectoryPath }, req) {
  if (!reporter.assets.cache) {
    // in main we don't cache express routes...
    return readAsset(reporter, definition, { id, name, encoding, currentDirectoryPath }, req)
  }

  const key = `${id}:${name}:${encoding}:${currentDirectoryPath}`
  return reporter.assets.cache.getAndSet(req.context.id, key, () => readAsset(reporter, definition, { id, name, encoding, currentDirectoryPath }, req))
}

async function readAsset (reporter, definition, { id, name, encoding, currentDirectoryPath }, req) {
  const allowAssetsLinkedToFiles = definition.options.allowAssetsLinkedToFiles !== false

  let escape = function (val) { return val }

  if (encoding === 'string') {
    escape = jsStringEscape
    encoding = 'utf8'
  }

  if (encoding === 'dataURI') {
    escape = function (val, name) {
      const type = mime.getType(name)
      const charset = type.startsWith('text') ? 'UTF-8' : null
      return 'data:' + type + (charset ? '; charset=' + charset : '') + ';base64,' + val
    }
    encoding = 'base64'
  }

  let asset

  if (id) {
    asset = await reporter.documentStore.collection('assets').findOne({
      _id: id
    }, definition.options.publicAccessEnabled ? null : req)

    if (!asset) {
      throw reporter.createError(`Unable to find asset with id ${id}`, {
        statusCode: 404,
        weak: true
      })
    }
  } else {
    if (!name) {
      throw reporter.createError('Asset path is required', {
        statusCode: 400,
        weak: true
      })
    }

    if (typeof name !== 'string') {
      throw reporter.createError('Asset path must be a string', {
        statusCode: 400,
        weak: true
      })
    }

    const assetNameIsPath = name.indexOf('/') !== -1
    const pathParts = name.split('/').filter((p) => p)
    let assetName

    if (pathParts.length === 0) {
      throw reporter.createError('Invalid asset path, path should target something', {
        statusCode: 400,
        weak: true
      })
    }

    let assets = []

    assetName = [...pathParts].pop()

    const resolvedCurrentDirectoryPath = currentDirectoryPath != null ? await currentDirectoryPath() : null
    const result = await reporter.folders.resolveEntityFromPath(name, 'assets', { currentPath: resolvedCurrentDirectoryPath }, req)

    if (result) {
      assets = [result.entity]
    }

    if (assets.length === 0 && !assetNameIsPath) {
      // fallback to global search by name (with no folder)
      assetName = name

      assets = await reporter.documentStore.collection('assets').find({
        name
      }, definition.options.publicAccessEnabled ? null : req)
    }

    if (assets.length === 0) {
      // fallback to search by link field
      assets = await reporter.documentStore.collection('assets').find({
        link: name
      }, definition.options.publicAccessEnabled ? null : req)
    }

    if (assets.length > 1) {
      throw reporter.createError(`Duplicated assets found for ${assetName}`, {
        statusCode: 400,
        weak: true
      })
    }

    if (assets.length === 1) {
      asset = assets[0]
    }

    if (!asset) {
      if (definition.options.searchOnDiskIfNotFoundInStore !== true) {
        throw reporter.createError(`Asset ${name} not found`, {
          statusCode: 400,
          weak: true
        })
      }

      if (encoding === 'link') {
        return {
          content: resolveAssetLink(reporter, definition, req, { name }),
          filename: name
        }
      }

      let file
      try {
        file = await readFile(reporter, definition, name)
      } catch (e) {
        throw reporter.createError(`Asset ${name} not found in the store and also not on the disk: ` + e.message, {
          statusCode: 400,
          weak: true
        })
      }

      return {
        content: encoding === 'buffer' ? file.content : escape(Buffer.from(file.content || '').toString(encoding), file.filename),
        filename: file.filename,
        modified: file.modified
      }
    }
  }

  if (encoding === 'link') {
    if (asset.link && !allowAssetsLinkedToFiles) {
      throw reporter.createError(`Can't not read asset "${name}" from .link path "${asset.link}" when "allowAssetsLinkedToFiles" option is false`, {
        statusCode: 400,
        weak: true
      })
    }

    if (asset.link) {
      return {
        content: resolveAssetLink(reporter, definition, req, { name: asset.link }),
        filename: name,
        entity: asset
      }
    }

    const entityPath = await reporter.folders.resolveEntityPath(asset, 'assets', req)
    return {
      content: resolveAssetLink(reporter, definition, req, { name: entityPath }),
      filename: name,
      entity: asset
    }
  }

  if (asset.link) {
    if (!allowAssetsLinkedToFiles) {
      throw reporter.createError(`Can't not read asset "${name}" from .link path "${asset.link}" when "allowAssetsLinkedToFiles" option is false`, {
        statusCode: 400,
        weak: true
      })
    }

    const file = await readFile(reporter, definition, asset.link)

    return {
      content: encoding === 'buffer' ? file.content : escape(Buffer.from(file.content).toString(encoding), file.filename),
      filename: file.filename,
      modified: file.modified,
      entity: asset
    }
  }

  const buf = Buffer.from(asset.content || '')

  return {
    content: encoding === 'buffer' ? buf : escape(buf.toString(encoding), asset.name),
    buffer: buf,
    filename: asset.name,
    modified: asset.modificationDate || new Date(),
    entity: asset
  }
}

async function readFile (reporter, definition, link) {
  const pathToLinkedFile = linkPath(reporter, definition, link)

  try {
    const content = await fs.readFile(pathToLinkedFile)
    const stat = await fs.stat(pathToLinkedFile)

    return {
      content: stripBom(content),
      filename: path.basename(pathToLinkedFile),
      modified: stat.mtime
    }
  } catch (e) {
    throw reporter.createError(`Unable to find or read file ${pathToLinkedFile}`, {
      weak: true,
      original: e
    })
  }
}

function linkPath (reporter, definition, link) {
  const result = path.isAbsolute(link) ? link : path.join(reporter.options.rootDirectory, link)
  let extension = path.extname(result)

  if (extension === '' || extension === '.') {
    extension = ''
  }

  if (!isAssetPathValid(definition.options.allowedFiles, link, result)) {
    throw reporter.createError(`Request to file ${result} denied. Please allow it by setting config { "extensions": { "assets": { "allowedFiles": ${extension !== '' ? `"**/foo${extension}"` : '"**/*.*"'} } } }${extension !== '' ? ' or the more general { "extensions": { "assets": { "allowedFiles": "**/*.*" } } }' : ''}`, {
      weak: true,
      statusCode: 403
    })
  }

  return result
}

function combineURLs () {
  let resPath = ''
  for (const p of arguments) {
    if (p) {
      if (resPath) {
        resPath += '/'
      }
      resPath += p.replace(/^\/+/, '')
      resPath = resPath.replace(/\/+$/, '')
    }
  }

  return resPath
}

function resolveAssetLink (reporter, definition, req, { name: assetName, module = false }) {
  if (definition.options.rootUrlForLinks) {
    return combineURLs(definition.options.rootUrlForLinks, 'assets', 'content', assetName)
  }

  if (!reporter.express) {
    return combineURLs('assets', 'content', assetName)
  }

  const baseUrl = req.context.http ? req.context.http.baseUrl : reporter.express.localhostUrl
  const url = combineURLs(baseUrl, 'assets', 'content', assetName)

  if (module) {
    return `${url}?module=true`
  }

  return url
}

function isAssetPathValid (allowedFiles, link, absolutePath) {
  return (allowedFiles != null) && (minimatch(absolutePath, allowedFiles) || minimatch(absolutePath.replace('/', '\\'), allowedFiles) ||
      minimatch(link, allowedFiles) || minimatch(link.replace('/', '\\'), allowedFiles))
}
