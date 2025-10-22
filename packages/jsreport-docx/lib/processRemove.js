const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, getClosestEl } = require('./utils')

const removeCommentRegExp = /__docxRemove(\d+)__/

const validTargets = {
  paragraph: 'w:p',
  row: 'w:tr',
  table: 'w:tbl'
}

module.exports = function processRemove (removeMap, xmlStr) {
  const doc = new DOMParser().parseFromString(`<docxXml>${xmlStr}</docxXml>`)

  const removeComments = []
  const pending = [doc.documentElement]

  while (pending.length > 0) {
    const el = pending.pop()

    if (el.childNodes == null) {
      continue
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      const childEl = el.childNodes[i]

      if (childEl.nodeType === 8) {
        const match = removeCommentRegExp.exec(childEl.nodeValue)

        if (match != null) {
          const id = parseInt(match[1], 10)
          removeComments.push([id, childEl])
        }
      } else {
        pending.push(childEl)
      }
    }
  }

  for (const [id, commentEl] of removeComments) {
    const removeComment = () => {
      const parentElOfCall = commentEl.parentNode

      parentElOfCall.removeChild(commentEl)

      if (parentElOfCall.childNodes.length === 0) {
        parentElOfCall.parentNode.removeChild(parentElOfCall)
      }
    }

    if (!removeMap.has(id)) {
      removeComment()
      continue
    }

    const removeData = removeMap.get(id)

    if (removeData.value) {
      const targetElName = validTargets[removeData.target]

      if (!targetElName) {
        throw new Error(`Invalid target "${removeData.target}" for docxRemove`)
      }

      const targetEl = getClosestEl(commentEl, targetElName)

      if (targetEl) {
        targetEl.parentNode.removeChild(targetEl)
      } else {
        removeComment()
      }
    } else {
      removeComment()
    }
  }

  const items = nodeListToArray(doc.documentElement.childNodes)

  return items.map((el) => el.toString()).join('')
}
