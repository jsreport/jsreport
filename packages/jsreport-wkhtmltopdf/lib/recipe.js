const path = require('path')
const childProcess = require('child_process')
const wkhtmltopdf = require('wkhtmltopdf-installer')

module.exports = async (reporter, definition, request, response) => {
  request.template.wkhtmltopdf = request.template.wkhtmltopdf || {}
  const options = request.template.wkhtmltopdf

  options.allowLocalFilesAccess = definition.options.allowLocalFilesAccess

  try {
    const paths = {}
    const { pathToFile } = await response.output.writeToTempFile((uuid) => `${uuid}.html`)

    paths.template = pathToFile

    await processHeaderAndFooter(reporter, options, request, paths)

    const outputPath = await conversion(reporter, definition, createParams(reporter, request, options, definition, paths), request)

    response.meta.contentType = 'application/pdf'
    response.meta.fileExtension = 'pdf'

    await response.output.update(outputPath)
  } catch (err) {
    throw reporter.createError('Error while processing wkhtmltopdf', {
      original: err,
      weak: true
    })
  }
}

function createParams (reporter, request, options, definition, paths) {
  const params = []

  params.push('--debug-javascript')

  if (!options.allowLocalFilesAccess) {
    params.push('--disable-local-file-access')
  }

  Object.keys(definition.options).forEach(function (k) {
    if (k === 'allowLocalFilesAccess' || k === 'wkhtmltopdfVersions' || k === 'execOptions') {
      return
    }

    params.push('--' + k)

    if (definition.options[k] !== true) {
      params.push(definition.options[k])
    }
  })

  if (options.dpi) {
    params.push('--dpi')
    params.push(options.dpi)
  }

  if (options.javascriptDelay) {
    params.push('--javascript-delay')
    params.push(options.javascriptDelay)
  }

  if (options.windowStatus) {
    params.push('--window-status')
    params.push(options.windowStatus)
  }

  if (options.pageHeight) {
    params.push('--page-height')
    params.push(options.pageHeight)
  }

  if (options.pageWidth) {
    params.push('--page-width')
    params.push(options.pageWidth)
  }

  if (options.pageSize) {
    params.push('--page-size')
    params.push(options.pageSize)
  }

  if (options.marginBottom || options.marginBottom === 0) {
    params.push('--margin-bottom')
    params.push(options.marginBottom)
  }

  if (options.marginLeft || options.marginLeft === 0) {
    params.push('--margin-left')
    params.push(options.marginLeft)
  }

  if (options.marginRight || options.marginRight === 0) {
    params.push('--margin-right')
    params.push(options.marginRight)
  }

  if (options.marginTop || options.marginTop === 0) {
    params.push('--margin-top')
    params.push(options.marginTop)
  }

  if (options.orientation) {
    params.push('--orientation')
    params.push(options.orientation)
  }

  if (options.title) {
    params.push('--title')
    params.push(options.title)
  }

  if (options.header) {
    if (options.headerHeight) {
      params.push('--header-spacing')
      params.push(options.headerHeight)
    }

    params.push('--header-html')
    params.push('file:///' + paths['template-header'])
  }

  if (options.footer) {
    if (options.footerHeight) {
      params.push('--footer-spacing')
      params.push(options.footerHeight)
    }

    params.push('--footer-html')
    params.push('file:///' + paths['template-footer'])
  }

  if (options.cover) {
    params.push('cover')
    params.push('file:///' + paths['template-cover'])
  }

  if (options.keepRelativeLinks && JSON.parse(options.keepRelativeLinks)) {
    params.push('--keep-relative-links')
  }

  if (options.printMediaType && JSON.parse(options.printMediaType)) {
    params.push('--print-media-type')
  }

  if (options.disableSmartShrinking && JSON.parse(options.disableSmartShrinking)) {
    params.push('--disable-smart-shrinking')
  }

  if (options.toc && JSON.parse(options.toc)) {
    params.push('toc')

    if (options.tocHeaderText) {
      params.push('--toc-header-text')
      params.push(options.tocHeaderText)
    }

    if (options.tocLevelIndentation) {
      params.push('--toc-level-indentation ')
      params.push(options.tocLevelIndentation)
    }

    if (options.tocTextSizeShrink) {
      params.push('--toc-text-size-shrink ')
      params.push(options.tocTextSizeShrink)
    }
  }

  params.push(paths.template)

  const outputPath = path.join(
    path.dirname(paths.template),
        `${path.basename(paths.template, '.html')}.pdf`
  )

  params.push(outputPath)

  return params
}

async function processPart (reporter, options, req, type, paths) {
  if (!options[type]) {
    return
  }

  reporter.logger.debug(`Starting child request to render wkhtmltopdf for ${type}`, req)

  // do an anonymous render
  const template = {
    content: options[type],
    engine: req.template.engine,
    recipe: 'html',
    helpers: req.template.helpers
  }

  try {
    const res = await reporter.render({
      template
    }, req)

    reporter.logger.debug(`Child request to render wkhtmltopdf for ${type} finished`, req)

    const { pathToFile } = await res.output.writeToTempFile((uuid) => `${uuid}-${type}.html`)

    paths[`template-${type}`] = pathToFile
  } catch (err) {
    throw reporter.createError(`Child request render for ${type} failed`, {
      original: err
    })
  }
}

async function processHeaderAndFooter (reporter, options, req, paths) {
  await processPart(reporter, options, req, 'header', paths)
  await processPart(reporter, options, req, 'footer', paths)
  await processPart(reporter, options, req, 'cover', paths)
}

function conversion (reporter, definition, parameters, request) {
  let exePath = wkhtmltopdf.path

  if (request.template.wkhtmltopdf.wkhtmltopdfVersion) {
    const wkhtmltopdfVersions = definition.options.wkhtmltopdfVersions.filter(function (p) {
      return p.version === request.template.wkhtmltopdf.wkhtmltopdfVersion
    })

    // default doesn't have a path
    if (wkhtmltopdfVersions.length === 1 && wkhtmltopdfVersions[0].path) {
      exePath = wkhtmltopdfVersions[0].path
    }
  }

  reporter.logger.debug('wkhtmltopdf  ' + parameters.join(' '), request)

  const timeout = reporter.getReportTimeout(request)

  const execOptions = Object.assign({}, definition.options.execOptions)

  if (timeout != null) {
    execOptions.timeout = timeout
    execOptions.killSignal = 'SIGTERM'
  }

  return new Promise(function (resolve, reject) {
    childProcess.execFile(exePath, parameters, execOptions, function (err, stderr, stdout) {
      reporter.logger.debug((err || '') + (stderr || '') + (stdout || ''), request)

      if (err) {
        if (err.killed && err.signal === 'SIGTERM' && execOptions.timeout != null) {
          return reject(reporter.createError(`Timeout Error: wkhtmltopdf generation not completed after ${execOptions.timeout} ms`, { weak: true, statusCode: 400 }))
        }

        return reject(err)
      }

      resolve(parameters[parameters.length - 1])
    })
  })
}
