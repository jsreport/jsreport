const extend = require('node.extend.without.arrays')

module.exports = (reporter) => {
  reporter.addRequestContextMetaConfig('renderHierarchy', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('currentFolderPath', { sandboxReadOnly: true })

  reporter.beforeRenderListeners.add('templates', async (req, res) => {
    if (
      !req.template._id &&
      !req.template.shortid &&
      !req.template.name
    ) {
      if (req.template.content == null) {
        throw reporter.createError('Template must contains _id, name, shortid or content attribute', {
          weak: true,
          statusCode: 400
        })
      }

      reporter.logger.info(
        `Rendering anonymous template { recipe: ${req.template.recipe}, engine: ${req.template.engine} }`,
        req
      )

      return
    }

    const template = req.context.resolvedTemplate

    if (!template && !req.template.content) {
      throw reporter.createError(`Unable to find specified template or user does not have permissions to read it: ${
        (req.template._id || req.template.shortid || req.template.name)
      }`, {
        weak: true,
        statusCode: 404
      })
    }

    req.context.renderHierarchy = req.context.renderHierarchy || []

    if (template && template._id != null) {
      req.context.renderHierarchy.push(template._id)
    }

    // store a copy to prevent side-effects
    req.template = template ? extend(true, {}, template, req.template) : req.template
    req.template.content = req.template.content || ''

    reporter.logger.info(
      `Rendering template { name: ${req.template.name}, recipe: ${req.template.recipe}, engine: ${req.template.engine}, preview: ${(req.options.preview || false)} }`,
      req
    )

    if (!req.options.reportName && req.template.name) {
      res.meta.reportName = req.template.name
    }

    req.context.currentFolderPath = await resolveCurrentPath(reporter, req)
  })
}

async function resolveCurrentPath (reporter, req) {
  if (!req.template) {
    return null
  }

  const pathFragments = []
  let currentFolder = req.template.folder

  if (currentFolder) {
    currentFolder = await reporter.documentStore.collection('folders').findOne({ shortid: currentFolder.shortid }, req)
  }

  while (currentFolder) {
    pathFragments.push(currentFolder.name)

    if (!currentFolder.folder) {
      currentFolder = null
    } else {
      currentFolder = await reporter.documentStore.collection('folders').findOne({ shortid: currentFolder.folder.shortid }, req)
    }
  }

  return '/' + pathFragments.reverse().join('/')
}
