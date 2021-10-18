
module.exports = (reporter) => {
  return {
    resolveTemplate: (req) => resolveTemplate(reporter, req)
  }
}

async function resolveTemplate (reporter, req) {
  let queryResult

  if (req.template._id) {
    queryResult = {
      query: { _id: req.template._id },
      meta: { field: '_id', value: req.template._id }
    }
  } else if (req.template.shortid) {
    queryResult = {
      query: { shortid: req.template.shortid },
      meta: { field: 'shortid', value: req.template.shortid }
    }
  }

  const meta = {}
  let templates = []

  if (queryResult) {
    meta.field = queryResult.meta.field
    meta.value = queryResult.meta.value
    templates = await reporter.documentStore.collection('templates').find(queryResult.query, req)
  } else if (req.template.name) {
    const nameIsPath = req.template.name.indexOf('/') !== -1

    meta.field = 'name'
    meta.value = req.template.name

    if (!req.template.name.startsWith('/') && nameIsPath && !req.context.currentFolderPath) {
      throw reporter.createError('Invalid template path, path should be absolute and start with "/"', {
        statusCode: 400,
        weak: true
      })
    }

    const pathParts = req.template.name.split('/').filter((p) => p)

    if (pathParts.length === 0) {
      throw reporter.createError('Invalid template path,', {
        statusCode: 400,
        weak: true
      })
    }

    if (!nameIsPath) {
      // if name is not path do global search by name (with no folder).
      // since template name resolution here does not support relative syntax we should not run
      // resolveEntityFromPath if the name is not path
      templates = await reporter.documentStore.collection('templates').find({
        name: req.template.name
      }, req)
    } else {
      const result = await reporter.folders.resolveEntityFromPath(req.template.name, 'templates', req)

      if (result) {
        templates = [result.entity]
      }
    }
  }

  let template

  if (templates.length > 1) {
    throw reporter.createError(`Duplicated templates found for query ${meta.field}: ${meta.value}`, {
      statusCode: 400,
      weak: true
    })
  }

  if (templates.length === 1) {
    template = templates[0]
  }

  return template
}
