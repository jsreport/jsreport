const PdfManipulator = require('./pdfManipulator')

module.exports = async (inputs, reporter, req, res) => {
  const { pdfContent, operations, pdfMeta, pdfPassword, pdfSign, pdfA, pdfAccessibility, pdfCompression, outlines, removeHiddenMarks } = inputs

  const runRender = async (shortidOrTemplate, data) => {
    let templateToUse

    if (typeof shortidOrTemplate === 'string') {
      templateToUse = { shortid: shortidOrTemplate }
    } else {
      templateToUse = { ...shortidOrTemplate }
    }

    const res = await reporter.render({ template: templateToUse, data, options: { pdfUtils: { removeHiddenMarks: false } } }, req)
    const content = await res.output.getBuffer()
    return content
  }

  const pdfBuf = pdfContent
  const manipulator = PdfManipulator(pdfBuf, {
    pdfMeta,
    pdfPassword,
    pdfSign,
    outlines,
    pdfA,
    pdfAccessibility,
    pdfCompression,
    removeHiddenMarks,
    hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
  })
  const operationsToProcess = operations.filter(o => o.templateShortid || o.template)

  reporter.logger.debug(`pdf-utils detected ${operationsToProcess.length} pdf operation(s) to process`, req)

  for (const operation of operationsToProcess) {
    if (operation.enabled === false) {
      reporter.logger.debug(`Skipping disabled pdf operation ${operation.type}`, req)
      continue
    }

    await manipulator.parse({
      hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
    })

    let templateDef

    if (operation.templateShortid) {
      templateDef = operation.templateShortid
    } else {
      templateDef = operation.template
    }

    if (operation.type === 'append') {
      const profilerEvent = reporter.profiler.emit({
        type: 'operationStart',
        subtype: 'pdfUtilsAppend',
        name: 'pdf utils append',
        group: 'Pdf Utils: append'
      }, req, res)

      reporter.logger.debug(`pdf-utils running pdf operation ${operation.type}`, req)

      await manipulator.append(await runRender(templateDef, { $pdf: { pages: manipulator.parsedPdf.pages } }))

      reporter.profiler.emit({
        type: 'operationEnd',
        operationId: profilerEvent.operationId
      }, req, res)
      continue
    }

    if (operation.type === 'prepend') {
      const profilerEvent = reporter.profiler.emit({
        type: 'operationStart',
        subtype: 'pdfUtilsPrepend',
        name: 'pdf utils prepend',
        group: 'Pdf Utils: prepend'
      }, req, res)
      reporter.logger.debug(`pdf-utils running pdf operation ${operation.type}`, req)

      await manipulator.prepend(await runRender(templateDef, { $pdf: { pages: manipulator.parsedPdf.pages } }))

      reporter.profiler.emit({
        type: 'operationEnd',
        operationId: profilerEvent.operationId
      }, req, res)
      continue
    }

    if (operation.type === 'merge') {
      const profilerEvent = reporter.profiler.emit({
        type: 'operationStart',
        subtype: 'pdfUtilsMerge',
        name: 'pdf utils merge',
        group: 'Pdf Utils: merge'
      }, req, res)
      if (operation.mergeWholeDocument) {
        reporter.logger.debug(`pdf-utils running pdf operation ${operation.type} (merge whole document)`, req)
        const mergeBuffer = await runRender(templateDef, { $pdf: { pages: manipulator.parsedPdf.pages } })
        await manipulator.merge(mergeBuffer, { mergeToFront: operation.mergeToFront })

        reporter.profiler.emit({
          type: 'operationEnd',
          operationId: profilerEvent.operationId
        }, req, res)
        continue
      }

      let optionLog = ''

      if (operation.renderForEveryPage) {
        optionLog = ' (render for each page)'
      }

      reporter.logger.debug(`pdf-utils running pdf operation ${operation.type}${optionLog}`, req)

      const singleMergeBuffer = !operation.renderForEveryPage
        ? await runRender(templateDef, { $pdf: { pages: manipulator.parsedPdf.pages } })
        : null

      const pagesBuffers = []

      for (let i = 0; i < manipulator.parsedPdf.pages.length; i++) {
        if (!singleMergeBuffer && manipulator.parsedPdf.pages[i].group) {
          reporter.logger.debug(`pdf-utils invokes merge with group ${manipulator.parsedPdf.pages[i].group}`, req)
        }

        pagesBuffers[i] = singleMergeBuffer || await runRender(templateDef, {
          $pdf: {
            pages: manipulator.parsedPdf.pages,
            pageIndex: i,
            pageNumber: i + 1
          }
        })
      }

      await manipulator.merge(pagesBuffers, { mergeToFront: operation.mergeToFront })

      reporter.profiler.emit({
        type: 'operationEnd',
        operationId: profilerEvent.operationId
      }, req, res)
      continue
    }
  }

  const postProcessProfilerEvent = reporter.profiler.emit({
    type: 'operationStart',
    subtype: 'pdfUtilsPostProcess',
    name: 'pdf utils postprocess'
  }, req, res)

  reporter.logger.debug('pdf-utils postprocess start', req)

  await manipulator.postprocess({
    hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
  })

  reporter.logger.debug('pdf-utils postprocess end', req)

  reporter.profiler.emit({
    type: 'operationEnd',
    operationId: postProcessProfilerEvent.operationId
  }, req, res)

  return manipulator.toBuffer()
}
