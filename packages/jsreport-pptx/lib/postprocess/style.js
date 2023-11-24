const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc

    const pptxStylesEls = nodeListToArray(doc.getElementsByTagName('pptxStyles'))

    for (const pptxStylesEl of pptxStylesEls) {
      let currentEl = pptxStylesEl.nextSibling
      let pptxStyleEndEl
      const middleEls = []
      const runEls = []

      if (currentEl != null) {
        do {
          if (currentEl.nodeName === 'pptxStyleEnd') {
            pptxStyleEndEl = currentEl
            currentEl = null
          } else {
            middleEls.push(currentEl)
            currentEl = currentEl.nextSibling
          }
        } while (currentEl != null)
      }

      if (pptxStyleEndEl == null) {
        throw new Error('Could not find pptxStyleEnd element for pptxStyle processing')
      }

      for (const el of middleEls) {
        const currentREls = nodeListToArray(el.getElementsByTagName('a:r'))
        runEls.push(...currentREls)
      }

      processPptxStylesEl(pptxStylesEl, pptxStyleEndEl, runEls, doc)
    }
  }
}

function processPptxStylesEl (pptxStylesEl, pptxStyleEndEl, runEls, doc) {
  let started = false
  let currentStyleEl

  for (let i = 0; i < runEls.length; i++) {
    const aR = runEls[i]
    const ts = aR.getElementsByTagName('a:t')
    if (ts.length === 0) {
      continue
    }

    if (started === false && ts[0].textContent.includes('$pptxStyleStart')) {
      started = true
      const startIdx = ts[0].textContent.indexOf('$pptxStyleStart')
      ts[0].textContent = ts[0].textContent.replace('$pptxStyleStart', '')
      const id = ts[0].textContent.substring(startIdx, ts[0].textContent.indexOf('$'))
      ts[0].textContent = ts[0].textContent.replace(id + '$', '')
      currentStyleEl = nodeListToArray(pptxStylesEl.childNodes).find(n => n.getAttribute('id') === id)
    }

    if (ts[0].textContent.includes('$pptxStyleEnd')) {
      ts[0].setAttribute('xml:space', 'preserve')
      started = false
      ts[0].textContent = ts[0].textContent.replace('$pptxStyleEnd', '')
      color(doc, aR, currentStyleEl)
      continue
    }

    if (started === true) {
      ts[0].setAttribute('xml:space', 'preserve')
      color(doc, aR, currentStyleEl)
    }
  }

  pptxStylesEl.parentNode.removeChild(pptxStylesEl)
  pptxStyleEndEl.parentNode.removeChild(pptxStyleEndEl)
}

function color (doc, aR, currentStyleEl) {
  let ap = aR.parentNode

  while (ap != null && ap.nodeName !== 'a:p') {
    ap = ap.parentNode
  }

  if (!ap) {
    throw new Error('Could not find paragraph node for styles')
  }

  let aRpr = aR.getElementsByTagName('a:rPr')[0]

  if (!aRpr) {
    aRpr = doc.createElement('a:rPr')
    if (aR.childNodes.length === 0) {
      aR.appendChild(aRpr)
    } else {
      aR.insertBefore(aRpr, aR.getElementsByTagName('a:t')[0])
    }
  }

  const currentBackgroundColor = currentStyleEl.getAttribute('backgroundColor')

  if (currentBackgroundColor != null && currentBackgroundColor !== '') {
    let aHighlight = aRpr.getElementsByTagName('a:highlight')[0]

    if (!aHighlight) {
      aHighlight = doc.createElement('a:highlight')
      aRpr.insertBefore(aHighlight, aRpr.firstChild)
    }

    let color = aHighlight.getElementsByTagName('a:srgbClr')[0]

    if (!color) {
      color = doc.createElement('a:srgbClr')
      aHighlight.insertBefore(color, aHighlight.firstChild)
    }

    color.setAttribute('val', currentBackgroundColor)
    color.removeAttribute('a:themeColor')
    color.removeAttribute('a:themeTint')
    color.removeAttribute('a:themeShade')
    color.removeAttribute('a:themeFill')
    color.removeAttribute('a:themeFillTint')
    color.removeAttribute('a:themeFillShade')
  }

  const currentTextColor = currentStyleEl.getAttribute('textColor')

  if (currentTextColor != null && currentTextColor !== '') {
    let solidFill = aRpr.getElementsByTagName('a:solidFill')[0]

    if (!solidFill) {
      solidFill = doc.createElement('a:solidFill')
      aRpr.insertBefore(solidFill, aRpr.firstChild)
    }

    let color = solidFill.getElementsByTagName('a:srgbClr')[0]

    if (!color) {
      color = doc.createElement('a:srgbClr')
      solidFill.appendChild(color)
    }

    color.setAttribute('val', currentTextColor)
    color.removeAttribute('a:themeColor')
  }
}
