const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray } = require('./utils')

module.exports = function processCalcChain (calcChainUpdatesMap, xmlStr) {
  const calcChainMap = new Map()
  const doc = new DOMParser().parseFromString(`<xlsxXml>${xmlStr}</xlsxXml>`)
  const calcChainCellEls = nodeListToArray(doc.getElementsByTagName('c'))

  // storing the existing elements in a map for fast lookup
  for (const calcChainEl of calcChainCellEls) {
    calcChainMap.set(`${calcChainEl.getAttribute('i')}-${calcChainEl.getAttribute('r')}`, calcChainEl)
  }

  const updatedCalcChainCountMap = new Map()

  for (const [originalCalcChainCellKey, newCalcChainCellRefs] of calcChainUpdatesMap) {
    const [, originalCalcChainCellRef] = originalCalcChainCellKey.split('-')

    const calcChainCellRefEl = calcChainMap.get(originalCalcChainCellKey)

    if (calcChainCellRefEl == null) {
      continue
    }

    for (const newCalcChainCellRef of newCalcChainCellRefs) {
      const existingCount = updatedCalcChainCountMap.get(originalCalcChainCellRef) || 0

      if (originalCalcChainCellRef !== newCalcChainCellRef) {
        if (existingCount === 0) {
          calcChainCellRefEl.setAttribute('r', newCalcChainCellRef)
        } else {
          const newCalcChainCellRefEl = calcChainCellRefEl.cloneNode(true)
          newCalcChainCellRefEl.setAttribute('r', newCalcChainCellRef)
          calcChainCellRefEl.parentNode.insertBefore(newCalcChainCellRefEl, calcChainCellRefEl.nextSibling)
        }
      }

      updatedCalcChainCountMap.set(originalCalcChainCellRef, existingCount + 1)
    }
  }

  // if no updates return xml as it is
  if (updatedCalcChainCountMap.size === 0) {
    return xmlStr
  }

  // otherwise serialize the updated nodes
  const items = nodeListToArray(doc.documentElement.childNodes)
  const result = items.map((el) => el.toString()).join('')
  return result
}
