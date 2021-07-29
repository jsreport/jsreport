const PdfManipulator = require('./utils/pdfManipulator')

module.exports = (proxy, req) => {
  proxy.pdfUtils = {
    parse: async (sourcePdfBuf, includeText) => {
      const manipulator = PdfManipulator(sourcePdfBuf)

      const parsedPdf = await manipulator.parse({
        includeText,
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })

      return parsedPdf
    },
    prepend: async (sourcePdfBuf, extraPdfBuf) => {
      const manipulator = PdfManipulator(sourcePdfBuf)

      await manipulator.prepend(extraPdfBuf)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    append: async (sourcePdfBuf, extraPdfBuf) => {
      const manipulator = PdfManipulator(sourcePdfBuf)

      await manipulator.append(extraPdfBuf)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    merge: async (sourcePdfBuf, extraPdfBufOrPages, mergeToFront) => {
      const manipulator = PdfManipulator(sourcePdfBuf)

      // merge needs to have information about total of pages in source pdf
      await manipulator.parse({
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })

      await manipulator.merge(extraPdfBufOrPages, mergeToFront)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    removePages: async (sourcePdfBuf, pageNumbers) => {
      const manipulator = PdfManipulator(sourcePdfBuf)

      await manipulator.parse()
      await manipulator.removePages(pageNumbers)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    outlines: async (sourcePdfBuf, outlines) => {
      const manipulator = PdfManipulator(sourcePdfBuf, { outlines })

      await manipulator.postprocess({
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    }
  }
}
