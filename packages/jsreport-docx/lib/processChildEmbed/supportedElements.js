
/**
 * NOTE: An empty array for "allowedAttributes" or "allowedChildren" means don't inherit those values
 * which basically deletes all the attributes or children in the element,
 * a non existing "allowedAttributes" or "allowedChildren" means just inherit the values
 */

const { nodeListToArray } = require('../utils')

const elements = [
  {
    name: 'w:p',
    allowedAttributes: [],
    allowedChildren: ['w:pPr', 'w:r']
  },
  {
    name: 'w:pPr',
    allowedChildren: [
      'w:ind', 'w:jc', 'w:keepLines', 'w:keepNext',
      'w:pageBreakBefore', 'w:pBdr', 'w:rPr', 'w:spacing',
      'w:suppressAutoHyphens', 'w:suppressLineNumbers', 'w:suppressOverlap', 'w:tabs',
      'w:textAlignment', 'w:textboxTightWrap', 'w:textDirection', 'w:topLinePunct',
      'w:widowControl', 'w:wordWrap'
    ]
  },
  {
    name: 'w:r',
    allowedAttributes: [],
    allowedChildren: [
      'w:br', 'w:cr', 'w:rPr', 'w:t', 'w:tab', 'w:drawing'
    ]
  },
  {
    name: 'w:rPr',
    validate: (el) => (
      el.parentNode != null &&
      ['w:pPr', 'w:r'].includes(el.parentNode.nodeName)
    ),
    allowedChildren: (el) => {
      const parentEl = el.parentNode
      const allowed = []

      if (parentEl.nodeName === 'w:pPr' || parentEl.nodeName === 'w:r') {
        allowed.push(...[
          'w:b', 'w:bCs', 'w:caps', 'w:cs',
          'w:dstrike', 'w:effect', 'w:em', 'w:emboss',
          'w:highlight', 'w:i', 'w:iCs', 'w:imprint',
          'w:kern', 'w:lang', 'w:outline', 'w:position',
          'w:rtl', 'w:shadow', 'w:smallCaps', 'w:spacing',
          'w:specVanish', 'w:strike', 'w:sz', 'w:szCs',
          'w:vanish', 'w:vertAlign', 'w:w', 'w:webHidden',
          'w:noProof'
        ])
      }

      return allowed
    }
  },
  {
    name: 'w:drawing',
    validate: (el) => (
      el.parentNode != null &&
      nodeListToArray(el.childNodes).map((n) => n.nodeName).some((name) => name === 'wp:inline')
    ),
    allowedChildren: ['wp:inline']
  },
  {
    name: 'wp:inline',
    allowedAttributes: ['distB', 'distL', 'distR', 'distT'],
    allowedChildren: [
      'wp:extent', 'wp:effectExtent', 'wp:docPr', 'wp:cNvGraphicFramePr', 'a:graphic'
    ]
  },
  {
    name: 'wp:extent',
    allowedAttributes: ['cx', 'cy']
  },
  {
    name: 'wp:effectExtent',
    allowedAttributes: ['b', 'l', 'r', 't']
  },
  {
    name: 'wp:docPr',
    allowedAttributes: ['id', 'name', 'descr', 'hidden'],
    // we just want to parse the simple form of the docPr
    allowedChildren: []
  },
  {
    name: 'wp:cNvGraphicFramePr',
    allowedChildren: ['a:graphicFrameLocks']
  },
  {
    name: 'a:graphicFrameLocks',
    allowedAttributes: ['noChangeAspect', 'noDrilldown', 'noGrp', 'noMove', 'noResize', 'noSelect'],
    allowedChildren: []
  }
]

function getExtractMetadata (nodeName) {
  return elements.find((e) => e.name === nodeName)
}

module.exports.getExtractMetadata = getExtractMetadata
