const { findChildNode, getHeaderFooterDocs } = require('./utils')

module.exports.getSectionDetail = (sectionPrEl, { includesHeaderFooterReferences = true, documentFilePath, documentRelsDoc, files } = {}) => {
  let width
  let height
  let marginLeft
  let marginRight
  let cols
  const colsWidth = []

  const pgSzEl = findChildNode('w:pgSz', sectionPrEl)

  if (pgSzEl) {
    width = parseInt(pgSzEl.getAttribute('w:w'), 10)
    width = isNaN(width) ? null : width
    height = parseInt(pgSzEl.getAttribute('w:h'), 10)
    height = isNaN(height) ? null : height
  }

  if (width == null) {
    throw new Error('Page width is not defined for a section in the document.xml')
  }

  if (height == null) {
    throw new Error('Page height is not defined for a section in the document.xml')
  }

  const pgMarEl = findChildNode('w:pgMar', sectionPrEl)

  if (pgMarEl) {
    marginLeft = parseInt(pgMarEl.getAttribute('w:left'), 10)
    marginLeft = isNaN(marginLeft) ? 0 : marginLeft
    marginRight = parseInt(pgMarEl.getAttribute('w:right'), 10)
    marginRight = isNaN(marginRight) ? 0 : marginRight
  }

  const colsEl = findChildNode('w:cols', sectionPrEl)

  if (colsEl) {
    cols = parseInt(colsEl.getAttribute('w:num'), 10)
    cols = isNaN(cols) ? 1 : cols

    const colEls = findChildNode('w:col', colsEl, true)

    for (const colEl of colEls) {
      let colWidth = parseInt(colEl.getAttribute('w:w'), 10)
      colWidth = isNaN(colWidth) ? null : colWidth
      colsWidth.push(colWidth)
    }
  } else {
    cols = 1
  }

  if (colsWidth.length === 0) {
    const calculatedWidth = (width - marginLeft - marginRight) / cols

    for (let colIdx = 0; colIdx < cols; colIdx++) {
      colsWidth.push(calculatedWidth)
    }
  }

  let headerFooterReferences

  if (includesHeaderFooterReferences) {
    const headerReferences = findChildNode('w:headerReference', sectionPrEl, true).map((el) => ({
      type: 'header',
      referenceEl: el
    }))

    const footerReferences = findChildNode('w:footerReference', sectionPrEl, true).map((el) => ({
      type: 'footer',
      referenceEl: el
    }))

    if (headerReferences.length > 0 || footerReferences.length > 0) {
      headerFooterReferences = getHeaderFooterDocs([...headerReferences, ...footerReferences], documentFilePath, documentRelsDoc, files)
    }
  }

  const section = {
    width,
    height,
    marginLeft,
    marginRight,
    cols,
    colsWidth
  }

  if (headerFooterReferences) {
    section.headerFooterReferences = headerFooterReferences
  }

  return section
}
