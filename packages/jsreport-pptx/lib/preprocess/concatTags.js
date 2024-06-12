
// powerpoint splits strings like {{#each people}} into multiple xml nodes
// here we concat values from these splitted node and put it to one node
// so handlebars can correctly run
module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    concatTextNodes(f.doc, f.doc.getElementsByTagName('a:t'))
  }
}

function concatTextNodes (doc, elements) {
  const toRemove = []
  const lastIndex = elements.length - 1
  let startIndex = -1
  let shouldPreserveSpace = false
  let tag = ''

  for (let i = 0; i < elements.length; i++) {
    const value = elements[i].textContent
    let concatenating = startIndex !== -1
    let toEvaluate = value
    let validSiblings = false

    if (concatenating) {
      if (elements[i].parentNode.previousSibling?.localName === 'r') {
        validSiblings = elements[i].parentNode.previousSibling === elements[i - 1].parentNode
      } else {
        // ignore w:proofErr, w:bookmarkStart and other similar self-closed siblings tags
        let currentNode = elements[i].parentNode
        const previousSiblings = []

        while (currentNode && currentNode.previousSibling != null) {
          if (currentNode.previousSibling.localName === 'r') {
            previousSiblings.push(currentNode.previousSibling)
          }

          currentNode = currentNode.previousSibling
        }

        validSiblings = previousSiblings.some((s) => s === elements[i - 1].parentNode)
      }
    }

    // checking that nodes are valid siblings for the concat to be valid, if they are not siblings stop
    // concatenation at current index, this prevents concatenating text with bad syntax with lists
    if (concatenating && !validSiblings) {
      elements[startIndex].textContent = tag
      concatenating = false
      tag = ''
      shouldPreserveSpace = false
      startIndex = -1
    }

    if (concatenating) {
      const hasPreserveSpace = elements[i].getAttribute('xml:space') === 'preserve'
      toEvaluate = tag + value

      if (hasPreserveSpace) {
        // if one of the nodes we are about to concat has the xml:space="preserve" then
        // enable this flag to later evaluate if the text node should include the xml:space="preserve" or not
        shouldPreserveSpace = true
      }

      // if the node is empty but contain the preserve attribute then it is considered to be a space
      // so we need to add an space to the evaluated text for handlebars to recognize correctly the space
      if (!value && hasPreserveSpace) {
        toEvaluate += ' '
      }
    }

    const openTags = matchRegExp(toEvaluate, '{', 'g')
    const closingTags = matchRegExp(toEvaluate, '}', 'g')

    if (
      (openTags.length > 0 && openTags.length === closingTags.length) ||
      // if it is incomplete and we are already on last node
      (concatenating && i === lastIndex)
    ) {
      tag = ''

      let tNodeToEvaluate

      if (concatenating) {
        const affectedTextNode = elements[startIndex]
        tNodeToEvaluate = affectedTextNode
        affectedTextNode.textContent = toEvaluate

        if (
          shouldPreserveSpace &&
          (
            affectedTextNode.textContent.startsWith(' ') ||
            affectedTextNode.textContent.endsWith(' ')
          )
        ) {
          // if the nodes inside the concat had the preserve attribute we check here
          // if the text content starts or ends with space, if yes we add the preserve attribute
          // because it is important to have this attribute for MS Word to render starting/ending space
          // in text node
          affectedTextNode.setAttribute('xml:space', 'preserve')
        } else if (
          affectedTextNode.getAttribute('xml:space') === 'preserve' &&
          !affectedTextNode.textContent.startsWith(' ') &&
          !affectedTextNode.textContent.endsWith(' ')
        ) {
          // the text node no longer needs the preserve attribute
          affectedTextNode.removeAttribute('xml:space')
        }

        startIndex = -1
        toRemove.push(i)
      } else {
        tNodeToEvaluate = elements[i]
      }

      let remainingText = tNodeToEvaluate.textContent

      // we execute it in a while because there can be multiple block helpers in one text no
      // (like the end of a block helper and the start of another one)
      // example: {{/if}}{{#if ...}}
      do {
        // detect if the text node only contain a block helper call
        // if yes then we mark this node to later remove it if its parent paragraph turns
        // to be empty
        if (remainingText.startsWith('{{#')) {
          remainingText = remainingText.replace(/^{{#[^{}]{0,500}}}/, '')
        } else if (remainingText.startsWith('{{else')) {
          remainingText = remainingText.replace(/^{{else ?[^{}]{0,500}}}/, '')
        } else if (remainingText.startsWith('{{/')) {
          remainingText = remainingText.replace(/^{{\/[^{}]{0,500}}}/, '')
        }
      } while (remainingText.startsWith('{{#'))

      if (remainingText === '') {
        tNodeToEvaluate.setAttribute('__block_helper__', true)
        tNodeToEvaluate.parentNode.parentNode.setAttribute('__block_helper_container__', true)

        const lastChildIsBlockHelperComment = (
          tNodeToEvaluate.parentNode.parentNode.lastChild.nodeName === '#comment' &&
          tNodeToEvaluate.parentNode.parentNode.lastChild.nodeValue === '__block_helper_container__'
        )

        // insert the comment just once
        if (!lastChildIsBlockHelperComment) {
          const commentNode = doc.createComment('__block_helper_container__')
          tNodeToEvaluate.parentNode.parentNode.appendChild(commentNode)
        }
      }

      shouldPreserveSpace = false
    } else if (openTags.length > 0 && openTags.length !== closingTags.length) {
      tag = toEvaluate

      if (concatenating) {
        toRemove.push(i)
      } else {
        startIndex = i
      }
    }
  }

  for (const r of toRemove) {
    elements[r].parentNode.parentNode.removeChild(elements[r].parentNode)
  }
}

function matchRegExp (str, pattern, flags) {
  const f = flags || ''
  const r = new RegExp(pattern, 'g' + f.replace(/g/g, ''))
  const a = []
  let m

  // eslint-disable-next-line no-cond-assign
  while (m = r.exec(str)) {
    a.push({
      index: m.index,
      offset: r.lastIndex
    })
  }

  return a
}
