const path = require('path')
const mime = require('mime')
const util = require('util')
const { spawn, exec } = require('child_process')
const execAsync = util.promisify(exec)
const url = require('url')
const fs = require('fs').promises

module.exports = function (reporter, definition) {
  reporter.beforeRenderListeners.insert(0, 'libreoffice', (req, res) => {
    // otherwise the output is html for office online
    if (req.template.libreOffice && req.template.libreOffice.enabled !== false && req.template.libreOffice.format) {
      req.options.preview = false
    }
  })

  let sofficePath
  let libreOfficeProfile

  reporter.afterRenderListeners.insert({ before: 'scripts' }, 'libreoffice', async (req, res) => {
    if (!req.template.libreOffice || req.template.libreOffice.enabled === false || (!req.template.libreOffice.format && !req.template.libreOffice.print) || req.context.isChildRequest) {
      return
    }

    await sofficeCommand({
      libreOfficeOptions: req.template.libreOffice,
      source: { res }
    }, req)
  })

  reporter.extendProxy((proxy, req, { sandboxRequire }) => {
    proxy.libreOffice = {
      async convert (content, format, options) {
        if (!content) {
          throw reporter.createError('jsreport.libreOffice.convert expect content buffer as the first parameter ', {
            weak: true
          })
        }

        if (!format) {
          throw reporter.createError('jsreport.libreOffice.convert expect format as the second parameter ', {
            weak: true
          })
        }

        return sofficeCommand({
          libreOfficeOptions: {
            format,
            ...options
          },
          source: {
            content
          }
        }, req)
      },
      async print (content, printer, options) {
        if (!content) {
          throw reporter.createError('jsreport.libreOffice.print expect content buffer as the first parameter ', {
            weak: true
          })
        }

        if (!printer) {
          throw reporter.createError('jsreport.libreOffice.print expect printer name as the second parameter ', {
            weak: true
          })
        }

        return sofficeCommand({
          libreOfficeOptions: {
            printer,
            ...options
          },
          source: {
            content
          }
        }, req)
      }
    }
  })

  async function sofficeCommand ({
    libreOfficeOptions,
    source
  }, req) {
    const profilerEvent = reporter.profiler.emit({
      type: 'operationStart',
      subtype: 'libreoffice',
      name: 'libreoffice ' + (libreOfficeOptions.printer ? `print ${libreOfficeOptions.printer}` : `convert ${libreOfficeOptions.format}`),
      doDiffs: false
    }, req)

    if (sofficePath == null) {
      if (definition.options.sofficePath) {
        sofficePath = definition.options.sofficePath
      } else {
        reporter.logger.debug('Searching for soffice path', req)
        sofficePath = await getSofficePath()
      }
    }

    if (libreOfficeProfile == null) {
      libreOfficeProfile = path.join(reporter.options.tempDirectory, 'libreoffice', `profile-${reporter.workerId}`)
      try {
        reporter.logger.debug('Creating libreoffice profile at ' + libreOfficeProfile, req)
        await execAsync(`"${sofficePath}" --convert-to pdf ${reporter.options.tempDirectory} --headless -env:UserInstallation=${url.pathToFileURL(libreOfficeProfile)} --outdir ${reporter.options.tempDirectory}`)
      } catch (e) {
        // the first render always fail because of missing profile for some reason
      }
    }

    try {
      let outputFilename
      let pathToFile
      if (source.res) {
        pathToFile = (await source.res.output.writeToTempFile((uuid) => {
          outputFilename = uuid + '.' + libreOfficeOptions.format
          return `${uuid}.bin`
        })).pathToFile
      } else {
        pathToFile = (await reporter.writeTempFile((uuid) => {
          outputFilename = uuid + '.' + libreOfficeOptions.format
          return `${uuid}.bin}`
        }, source.content)).pathToFile
      }

      await new Promise((resolve, reject) => {
        const stdout = []
        const stderr = []
        let failed = false

        const args = []

        if (libreOfficeOptions.printer) {
          args.push('--pt', libreOfficeOptions.printer)
        } else {
          args.push('--convert-to', libreOfficeOptions.format !== 'pdf' ? libreOfficeOptions.format : pdfExportString(libreOfficeOptions))
        }

        args.push(`${pathToFile}`)
        args.push('--headless')
        args.push(`-env:UserInstallation=${url.pathToFileURL(libreOfficeProfile)}`)

        if (!libreOfficeOptions.printer) {
          args.push('--outdir', path.dirname(pathToFile))
        }

        reporter.logger.debug(`libreoffice command ${sofficePath} ${args.join(' ')}`, req)
        const childProcess = spawn(sofficePath, args)

        childProcess.stdout.on('data', (data) => {
          stdout.push(data)
        })

        childProcess.stderr.on('data', (data) => {
          stderr.push(data)
        })

        childProcess.on('close', async (code) => {
          if (!failed) {
            if (stderr.length) {
              return reject(new Error(Buffer.concat(stderr).toString('utf8')))
            }
            resolve()
          }
        })

        childProcess.on('error', (err) => {
          failed = true
          reject(err)
        })

        return childProcess
      })

      reporter.profiler.emit({
        type: 'operationEnd',
        operationId: profilerEvent.operationId,
        doDiffs: false
      }, req)

      if (!libreOfficeOptions.printer) {
        if (source.res) {
          await source.res.output.update(path.join(path.dirname(pathToFile), outputFilename))

          source.res.meta.fileExtension = libreOfficeOptions.format
          source.res.meta.contentType = mime.getType(libreOfficeOptions.format)
        } else {
          return {
            content: await fs.readFile(path.join(path.dirname(pathToFile), outputFilename)),
            fileExtension: libreOfficeOptions.format
          }
        }
      }
    } catch (e) {
      throw reporter.createError('Error while executing LibreOffice', {
        original: e,
        weak: true
      })
    }
  }

  const getSofficePath = async () => {
    const getEnvVarKey = (key) => {
      const upperKey = key.toUpperCase()
      return Object.keys(process.env).find(k => k.toUpperCase() === upperKey)
    }

    const paths = (() => {
      switch (process.platform) {
        case 'darwin':
          return ['/Applications/LibreOffice.app/Contents/MacOS/soffice']
        case 'linux':
          return [
            '/usr/bin/libreoffice',
            '/usr/bin/soffice',
            '/snap/bin/libreoffice',
            '/opt/libreoffice/program/soffice',
            '/opt/libreoffice7.6/program/soffice'
          ]
        case 'win32': {
          const programFilesEnvKey = getEnvVarKey('ProgramFiles')
          const programFilesX86EnvKey = getEnvVarKey('ProgramFiles(x86)')
          return [
            programFilesEnvKey ? path.join(process.env[programFilesEnvKey], 'LibreOffice/program/soffice.exe') : null,
            programFilesX86EnvKey ? path.join(process.env[programFilesX86EnvKey], 'LIBREO~1/program/soffice.exe') : null,
            programFilesX86EnvKey ? path.join(process.env[programFilesX86EnvKey], 'LibreOffice/program/soffice.exe') : null
          ]
        }
      }
    }
    )().filter(p => p)

    for (const p of paths) {
      try {
        await fs.access(p)
        return p
      } catch (e) {

      }
    }

    throw reporter.createError('Could not find soffice binary on paths ' + paths.join(', '), {
      weak: true
    })
  }

  const pdfExportString = (libreOfficeOptions) => {
    const exportOptions = {}
    if (libreOfficeOptions.pdfExportWatermark) {
      exportOptions.Watermark = { type: 'string', value: libreOfficeOptions.pdfExportWatermark }
    }
    if (libreOfficeOptions.pdfExportPageRange) {
      exportOptions.PageRange = { type: 'string', value: libreOfficeOptions.pdfExportPageRange }
    }
    if (libreOfficeOptions.pdfExportUseLosslessCompression != null) {
      exportOptions.UseLosslessCompression = { type: 'boolean', value: libreOfficeOptions.pdfExportUseLosslessCompression }
    }
    if (libreOfficeOptions.pdfExportQuality) {
      exportOptions.Quality = { type: 'long', value: libreOfficeOptions.pdfExportQuality }
    }
    if (libreOfficeOptions.pdfExportReduceImageResolution != null) {
      exportOptions.ReduceImageResolution = { type: 'boolean', value: libreOfficeOptions.pdfExportReduceImageResolution }
    }
    if (libreOfficeOptions.pdfExportSelectPdfVersion) {
      exportOptions.SelectPdfVersion = { type: 'long', value: libreOfficeOptions.pdfExportSelectPdfVersion }
    }
    if (libreOfficeOptions.pdfExportMaxImageResolution) {
      exportOptions.MaxImageResolution = { type: 'long', value: libreOfficeOptions.pdfExportMaxImageResolution }
    }
    if (libreOfficeOptions.pdfExportPDFUACompliance != null) {
      exportOptions.PDFUACompliance = { type: 'boolean', value: libreOfficeOptions.pdfExportPDFUACompliance }
    }
    if (libreOfficeOptions.pdfExportUseTaggedPDF != null) {
      exportOptions.PDFUseTaggedPDF = { type: 'boolean', value: libreOfficeOptions.pdfExportUseTaggedPDF }
    }
    if (libreOfficeOptions.pdfExportExportFormFields != null) {
      exportOptions.ExportFormFields = { type: 'boolean', value: libreOfficeOptions.pdfExportExportFormFields }
    }
    if (libreOfficeOptions.pdfExportFormsType) {
      exportOptions.FormsType = { type: 'long', value: libreOfficeOptions.pdfExportFormsType }
    }
    if (libreOfficeOptions.pdfExportAllowDuplicateFieldNames != null) {
      exportOptions.AllowDuplicateFieldNames = { type: 'boolean', value: libreOfficeOptions.pdfExportAllowDuplicateFieldNames }
    }
    if (libreOfficeOptions.pdfExportExportBookmarks != null) {
      exportOptions.ExportBookmarks = { type: 'boolean', value: libreOfficeOptions.pdfExportExportBookmarks }
    }
    if (libreOfficeOptions.pdfExportExportPlaceholders != null) {
      exportOptions.ExportPlaceholders = { type: 'boolean', value: libreOfficeOptions.pdfExportExportPlaceholders }
    }
    if (libreOfficeOptions.pdfExportExportNotes != null) {
      exportOptions.ExportNotes = { type: 'boolean', value: libreOfficeOptions.pdfExportExportNotes }
    }
    if (libreOfficeOptions.pdfExportExportNotesPages != null) {
      exportOptions.ExportNotesPages = { type: 'boolean', value: libreOfficeOptions.pdfExportExportNotesPages }
    }
    if (libreOfficeOptions.pdfExportExportOnlyNotesPages != null) {
      exportOptions.ExportOnlyNotesPages = { type: 'boolean', value: libreOfficeOptions.pdfExportExportOnlyNotesPages }
    }
    if (libreOfficeOptions.pdfExportExportNotesInMargin != null) {
      exportOptions.ExportNotesInMargin = { type: 'boolean', value: libreOfficeOptions.pdfExportExportNotesInMargin }
    }
    if (libreOfficeOptions.pdfExportExportHiddenSlides != null) {
      exportOptions.ExportHiddenSlides = { type: 'boolean', value: libreOfficeOptions.pdfExportExportHiddenSlides }
    }
    if (libreOfficeOptions.pdfExportIsSkipEmptyPages != null) {
      exportOptions.IsSkipEmptyPages = { type: 'boolean', value: libreOfficeOptions.pdfExportIsSkipEmpty }
    }
    if (libreOfficeOptions.pdfExportEmbedStandardFonts != null) {
      exportOptions.EmbedStandardFonts = { type: 'boolean', value: libreOfficeOptions.pdfExportEmbedStandardFonts }
    }
    if (libreOfficeOptions.pdfExportIsAddStream != null) {
      exportOptions.IsAddStream = { type: 'boolean', value: libreOfficeOptions.pdfExportIsAddStream }
    }
    if (libreOfficeOptions.pdfExportWatermarkColor) {
      exportOptions.WatermarkColor = { type: 'long', value: libreOfficeOptions.pdfExportWatermarkColor }
    }
    if (libreOfficeOptions.pdfExportWatermarkFontHeight) {
      exportOptions.WatermarkFontHeight = { type: 'long', value: libreOfficeOptions.pdfExportWatermarkFontHeight }
    }
    if (libreOfficeOptions.pdfExportWatermarkRotateAngle) {
      exportOptions.WatermarkRotateAngle = { type: 'long', value: libreOfficeOptions.pdfExportWatermarkRotate }
    }
    if (libreOfficeOptions.pdfExportWatermarkFontName) {
      exportOptions.WatermarkFontName = { type: 'string', value: libreOfficeOptions.pdfExportWatermarkFontName }
    }
    if (libreOfficeOptions.pdfExportTiledWatermark) {
      exportOptions.TiledWatermark = { type: 'string', value: libreOfficeOptions.pdfExportTiledWatermark }
    }
    if (libreOfficeOptions.pdfExportUseReferenceXObject != null) {
      exportOptions.UseReferenceXObject = { type: 'boolean', value: libreOfficeOptions.pdfExportUseReferenceXObject }
    }
    if (libreOfficeOptions.pdfExportIsRedactMode != null) {
      exportOptions.IsRedactMode = { type: 'boolean', value: libreOfficeOptions.pdfExportIsRedactMode }
    }
    if (libreOfficeOptions.pdfExportSinglePageSheets != null) {
      exportOptions.SinglePageSheets = { type: 'boolean', value: libreOfficeOptions.pdfExportSinglePageSheets }
    }
    if (libreOfficeOptions.pdfExportResizeWindowToInitialPage != null) {
      exportOptions.ResizeWindowToInitialPage = { type: 'boolean', value: libreOfficeOptions.pdfExportResizeWindowToInitialPage }
    }
    if (libreOfficeOptions.pdfExportCenterWindow != null) {
      exportOptions.CenterWindow = { type: 'boolean', value: libreOfficeOptions.pdfExportCenterWindow }
    }
    if (libreOfficeOptions.pdfExportOpenInFullScreenMode != null) {
      exportOptions.OpenInFullScreenMode = { type: 'boolean', value: libreOfficeOptions.pdfExportOpenInFullScreenMode }
    }
    if (libreOfficeOptions.pdfExportDisplayPDFDocumentTitle != null) {
      exportOptions.DisplayPDFDocumentTitle = { type: 'boolean', value: libreOfficeOptions.pdfExportDisplayPDFDocumentTitle }
    }
    if (libreOfficeOptions.pdfExportHideViewerMenubar != null) {
      exportOptions.HideViewerMenubar = { type: 'boolean', value: libreOfficeOptions.pdfExportHideViewerMenubar }
    }
    if (libreOfficeOptions.pdfExportHideViewerToolbar != null) {
      exportOptions.HideViewerToolbar = { type: 'boolean', value: libreOfficeOptions.pdfExportHideViewerToolbar }
    }
    if (libreOfficeOptions.pdfExportHideViewerWindowControls != null) {
      exportOptions.HideViewerWindowControls = { type: 'boolean', value: libreOfficeOptions.pdfExportHideViewerWindowControls }
    }
    if (libreOfficeOptions.pdfExportUseTransitionEffects != null) {
      exportOptions.UseTransitionEffects = { type: 'boolean', value: libreOfficeOptions.pdfExportUseTransitionEffects }
    }
    if (libreOfficeOptions.pdfExportOpenBookmarkLevels) {
      exportOptions.OpenBookmarkLevels = { type: 'long', value: libreOfficeOptions.pdfExportOpenBookmarkLevels }
    }
    if (libreOfficeOptions.pdfExportExportBookmarksToPDFDestination != null) {
      exportOptions.ExportBookmarksToPDFDestination = { type: 'boolean', value: libreOfficeOptions.pdfExportExportBookmarksToPDFDestination }
    }
    if (libreOfficeOptions.pdfExportConvertOOoTargetToPDFTarget != null) {
      exportOptions.ConvertOOoTargetToPDFTarget = { type: 'boolean', value: libreOfficeOptions.pdfExportConvertOOoTargetToPDFTarget }
    }
    if (libreOfficeOptions.pdfExportExportLinksRelativeFsys != null) {
      exportOptions.ExportLinksRelativeFsys = { type: 'boolean', value: libreOfficeOptions.pdfExportExportLinksRelativeFsys }
    }
    if (libreOfficeOptions.pdfExportPDFViewSelection) {
      exportOptions.PDFViewSelection = { type: 'long', value: libreOfficeOptions.pdfExportPDFViewSelection }
    }
    if (libreOfficeOptions.pdfExportEncryptFile != null) {
      exportOptions.EncryptFile = { type: 'boolean', value: libreOfficeOptions.pdfExportEncryptFile }
    }
    if (libreOfficeOptions.pdfExportDocumentOpenPassword) {
      exportOptions.DocumentOpenPassword = { type: 'string', value: libreOfficeOptions.pdfExportDocumentOpenPassword }
    }
    if (libreOfficeOptions.pdfExportRestrictPermissions != null) {
      exportOptions.RestrictPermissions = { type: 'boolean', value: libreOfficeOptions.pdfExportRestrictPermissions }
    }
    if (libreOfficeOptions.pdfExportPermissionPassword) {
      exportOptions.PermissionPassword = { type: 'string', value: libreOfficeOptions.pdfExportPermissionPassword }
    }
    if (libreOfficeOptions.pdfExportPrinting) {
      exportOptions.Printing = { type: 'long', value: libreOfficeOptions.pdfExportPrinting }
    }
    if (libreOfficeOptions.pdfExportChanges) {
      exportOptions.Changes = { type: 'long', value: libreOfficeOptions.pdfExportChanges }
    }
    if (libreOfficeOptions.pdfExportEnableCopyingOfContent != null) {
      exportOptions.EnableCopyingOfContent = { type: 'boolean', value: libreOfficeOptions.pdfExportEnableCopyingOfContent }
    }
    if (libreOfficeOptions.pdfExportEnableTextAccessForAccessibilityTools != null) {
      exportOptions.EnableTextAccessForAccessibilityTools = { type: 'boolean', value: libreOfficeOptions.pdfExportEnableTextAccessForAccessibilityTools }
    }
    if (libreOfficeOptions.pdfExportSignPDF != null) {
      exportOptions.SignPDF = { type: 'boolean', value: libreOfficeOptions.pdfExportSignPDF }
    }
    if (libreOfficeOptions.pdfExportSignatureLocation) {
      exportOptions.SignatureLocation = { type: 'string', value: libreOfficeOptions.pdfExportSignatureLocation }
    }
    if (libreOfficeOptions.pdfExportSignatureReason) {
      exportOptions.SignatureReason = { type: 'string', value: libreOfficeOptions.pdfExportSignatureReason }
    }
    if (libreOfficeOptions.pdfExportSignatureContactInfo) {
      exportOptions.SignatureContactInfo = { type: 'string', value: libreOfficeOptions.pdfExportSignatureContactInfo }
    }
    if (libreOfficeOptions.pdfExportSignaturePassword) {
      exportOptions.SignaturePassword = { type: 'string', value: libreOfficeOptions.pdfExportSignaturePassword }
    }
    if (libreOfficeOptions.pdfExportSignCertificateSubjectName) {
      exportOptions.SignCertificateSubjectName = { type: 'string', value: libreOfficeOptions.pdfExportSignCertificateSubjectName }
    }
    if (libreOfficeOptions.pdfExportSignatureTSA) {
      exportOptions.SignatureTSA = { type: 'string', value: libreOfficeOptions.pdfExportSignatureTSA }
    }

    return 'pdf:writer_pdf_Export:' + JSON.stringify(exportOptions)
  }
}
