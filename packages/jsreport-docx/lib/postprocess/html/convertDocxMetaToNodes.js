const { customAlphabet } = require('nanoid')
const generateRandomSuffix = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4)
const { clearEl, createNode, findOrCreateChildNode, findChildNode, findDefaultStyleIdForName } = require('../../utils')

module.exports = function convertDocxMetaToNodes (docxMeta, htmlEmbedDef, mode, { doc, stylesDoc, paragraphNode } = {}) {
  if (mode !== 'block' && mode !== 'inline') {
    throw new Error(`Invalid conversion mode "${mode}"`)
  }

  const pending = docxMeta.map((meta) => ({ item: meta }))
  const result = []
  const stylesIdCache = new Map()

  let templateParagraphNode

  if (mode === 'block') {
    templateParagraphNode = paragraphNode.cloneNode(true)
    // inherit only the paragraph properties of the html embed call
    clearEl(templateParagraphNode, (c) => c.nodeName === 'w:pPr')
  }

  while (pending.length > 0) {
    const { parent, item: currentDocxMeta } = pending.shift()

    if (mode === 'block' && parent == null && currentDocxMeta.type !== 'paragraph') {
      throw new Error(`Top level elements in docx meta for "${mode}" mode must be paragraphs`)
    } else if (mode === 'inline' && parent == null && currentDocxMeta.type !== 'text') {
      throw new Error(`Top level elements in docx meta for "${mode}" mode must be text`)
    }

    if (currentDocxMeta.type === 'paragraph') {
      if (mode === 'inline') {
        throw new Error(`docx meta paragraph element can not be applied for "${mode}" mode`)
      }

      const containerEl = templateParagraphNode.cloneNode(true)

      const invalidChildMeta = currentDocxMeta.children.find((childMeta) => (
        childMeta.type !== 'text'
      ))

      if (invalidChildMeta != null) {
        throw new Error(`Invalid docx meta child "${invalidChildMeta.type}" found in paragraph`)
      }

      if (currentDocxMeta.title != null) {
        const pPrEl = findOrCreateChildNode(doc, 'w:pPr', containerEl)
        const pStyleEl = findOrCreateChildNode(doc, 'w:pStyle', pPrEl)
        const titleStyleId = addTitleStyleIfNeeded(stylesDoc, currentDocxMeta.title, stylesIdCache)
        pStyleEl.setAttribute('w:val', titleStyleId)
      }

      result.push(containerEl)

      const pendingItemsInCurrent = currentDocxMeta.children.map((meta) => ({
        parent: containerEl,
        item: meta
      }))

      if (pendingItemsInCurrent.length > 0) {
        pending.unshift(...pendingItemsInCurrent)
      }
    } else if (currentDocxMeta.type === 'text') {
      const runEl = htmlEmbedDef.tEl.parentNode.cloneNode(true)

      // inherit only the run properties of the html embed call
      clearEl(runEl, (c) => c.nodeName === 'w:rPr')

      if (currentDocxMeta.bold === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingBEl = findChildNode('w:b', rPrEl)

        if (existingBEl != null) {
          rPrEl.removeChild(existingBEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:b'), rPrEl.firstChild)
      }

      if (currentDocxMeta.italic === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingIEl = findChildNode('w:i', rPrEl)

        if (existingIEl != null) {
          rPrEl.removeChild(existingIEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:i'), rPrEl.firstChild)
      }

      if (currentDocxMeta.underline === true) {
        const rPrEl = findOrCreateChildNode(doc, 'w:rPr', runEl)
        const existingUEl = findChildNode('w:u', rPrEl)

        if (existingUEl != null) {
          rPrEl.removeChild(existingUEl)
        }

        rPrEl.insertBefore(createNode(doc, 'w:u', { attributes: { 'w:val': 'single' } }), rPrEl.firstChild)
      }

      const textEl = createNode(doc, 'w:t', { attributes: { 'xml:space': 'preserve' } })
      textEl.textContent = currentDocxMeta.value

      runEl.appendChild(textEl)

      if (mode === 'block') {
        if (parent == null) {
          throw new Error(`docx meta text element can not exists without parent for "${mode}" mode`)
        }

        parent.appendChild(runEl)
      } else if (mode === 'inline') {
        result.push(runEl)
      }
    } else {
      throw new Error(`Unsupported docx node "${currentDocxMeta.type}"`)
    }
  }

  stylesIdCache.clear()

  return result
}

function addTitleStyleIfNeeded (stylesDoc, titleLevel, cache) {
  if (cache.has(titleLevel)) {
    return cache.get(titleLevel)
  }

  const defaultNormalStyleId = findDefaultStyleIdForName(stylesDoc, 'Normal')

  if (defaultNormalStyleId == null || defaultNormalStyleId === '') {
    throw new Error('style for "Normal" not found')
  }

  const defaultParagraphFontStyleId = findDefaultStyleIdForName(stylesDoc, 'Default Paragraph Font', 'character')

  if (defaultParagraphFontStyleId == null || defaultParagraphFontStyleId === '') {
    throw new Error('style for "Default Paragraph Font" not found')
  }

  const stylesEl = stylesDoc.documentElement
  const existingStyleEls = findChildNode('w:style', stylesEl, true)
  const currentStyleEls = [...existingStyleEls]
  const randomSuffix = generateRandomSuffix()

  const createTitleStyleId = (tLvl) => {
    return `HdingTtle${randomSuffix}${tLvl}`
  }

  for (const currentTitleLevel of ['1', '2', '3', '4', '5', '6']) {
    const defaultHeadingTitleStyleId = findDefaultStyleIdForName(stylesDoc, `heading ${currentTitleLevel}`)

    if (defaultHeadingTitleStyleId == null || defaultHeadingTitleStyleId === '') {
      const titleStyleId = createTitleStyleId(currentTitleLevel)

      const [newTitleStyleEl, newTitleCharStyleEl] = createTitleStyle(
        stylesDoc,
        titleStyleId,
        currentTitleLevel,
        defaultNormalStyleId,
        defaultParagraphFontStyleId
      )

      stylesEl.insertBefore(newTitleStyleEl, currentStyleEls.at(-1).nextSibling)
      currentStyleEls.push(newTitleStyleEl)
      stylesEl.insertBefore(newTitleCharStyleEl, currentStyleEls.at(-1).nextSibling)
      currentStyleEls.push(newTitleCharStyleEl)
      cache.set(currentTitleLevel, titleStyleId)
    } else {
      cache.set(currentTitleLevel, defaultHeadingTitleStyleId)
    }
  }

  return cache.get(titleLevel)
}

function createTitleStyle (stylesDoc, titleStyleId, titleLevel, normalStyleId, paragraphFontStyleId) {
  const supportedTitleLevels = ['1', '2', '3', '4', '5', '6']

  if (!supportedTitleLevels.includes(titleLevel)) {
    throw new Error(`title level "${titleLevel}" not supported`)
  }

  const titleCharStyleId = `${titleStyleId}Char`
  const titleLevelInt = parseInt(titleLevel, 10)
  const outlineLevelInt = titleLevelInt - 1
  const uiPriority = getStyleUiPriority(stylesDoc, `heading ${titleLevel}`, '9')
  const beforeSpacing = titleLevelInt > 1 ? '40' : '240'
  let italic = false

  let size
  let color = '2F5496'
  const themeColor = 'accent1'
  let themeShade = 'BF'

  const result = []

  if (titleLevelInt === 1) {
    size = '32'
  } else if (titleLevelInt === 2) {
    size = '26'
  } else if (titleLevelInt === 3 || titleLevelInt === 6) {
    if (titleLevelInt === 3) {
      size = '24'
    }

    color = '1F3763'
    themeShade = '7F'
  } else if (titleLevelInt === 4) {
    italic = true
  }

  const newTitleStyle = createNode(stylesDoc, 'w:style', { attributes: { 'w:type': 'paragraph', 'w:styleId': titleStyleId } })
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:name', { attributes: { 'w:val': `heading ${titleLevel}` } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:basedOn', { attributes: { 'w:val': normalStyleId } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:next', { attributes: { 'w:val': normalStyleId } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:link', { attributes: { 'w:val': titleCharStyleId } }))
  newTitleStyle.appendChild(createNode(stylesDoc, 'w:uiPriority', { attributes: { 'w:val': uiPriority } }))

  if (titleLevelInt > 1) {
    newTitleStyle.appendChild(createNode(stylesDoc, 'w:unhideWhenUsed'))
  }

  newTitleStyle.appendChild(createNode(stylesDoc, 'w:qFormat'))

  newTitleStyle.appendChild(createNode(stylesDoc, 'w:pPr', {
    children: [
      createNode(stylesDoc, 'w:keepNext'),
      createNode(stylesDoc, 'w:keepLines'),
      createNode(stylesDoc, 'w:spacing', { attributes: { 'w:before': beforeSpacing } }),
      createNode(stylesDoc, 'w:outlineLvl', { attributes: { 'w:val': outlineLevelInt } })
    ]
  }))

  const createTitleRunProperties = () => {
    const children = [
      createNode(stylesDoc, 'w:rFonts', {
        attributes: {
          'w:asciiTheme': 'majorHAnsi',
          'w:eastAsiaTheme': 'majorEastAsia',
          'w:hAnsiTheme': 'majorHAnsi',
          'w:cstheme': 'majorBidi'
        }
      })
    ]

    if (italic) {
      children.push(createNode(stylesDoc, 'w:i'))
      children.push(createNode(stylesDoc, 'w:iCs'))
    }

    children.push(createNode(stylesDoc, 'w:color', {
      attributes: {
        'w:val': color,
        'w:themeColor': themeColor,
        'w:themeShade': themeShade
      }
    }))

    if (size != null) {
      children.push(createNode(stylesDoc, 'w:sz', { attributes: { 'w:val': size } }))
      children.push(createNode(stylesDoc, 'w:szCs', { attributes: { 'w:val': size } }))
    }

    return createNode(stylesDoc, 'w:rPr', {
      children
    })
  }

  newTitleStyle.appendChild(createTitleRunProperties())
  result.push(newTitleStyle)

  const newTitleCharStyle = createNode(stylesDoc, 'w:style', { attributes: { 'w:type': 'character', 'w:customStyle': '1', 'w:styleId': titleCharStyleId } })
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:name', { attributes: { 'w:val': `Heading Title ${titleLevel} Char` } }))
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:basedOn', { attributes: { 'w:val': paragraphFontStyleId } }))
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:link', { attributes: { 'w:val': titleStyleId } }))
  newTitleCharStyle.appendChild(createNode(stylesDoc, 'w:uiPriority', { attributes: { 'w:val': uiPriority } }))
  newTitleCharStyle.appendChild(createTitleRunProperties())

  result.push(newTitleCharStyle)

  return result
}

function getStyleUiPriority (stylesDoc, name, defaultValue) {
  const stylesEl = stylesDoc.documentElement
  const latentStylesEl = findChildNode('w:latentStyles', stylesEl)

  if (latentStylesEl == null) {
    return defaultValue
  }

  const latentStyleEl = findChildNode((n) => (
    n.nodeName === 'w:lsdException' && n.getAttribute('w:name') === name
  ), latentStylesEl)

  if (latentStyleEl == null) {
    return defaultValue
  }

  const uiPriority = latentStyleEl.getAttribute('w:uiPriority')

  if (uiPriority == null || uiPriority === '') {
    return defaultValue
  }

  return uiPriority
}
