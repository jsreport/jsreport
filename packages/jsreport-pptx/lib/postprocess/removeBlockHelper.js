const { nodeListToArray } = require('../utils')

module.exports = (files) => {
  for (const f of files.filter(f => f.path.endsWith('.xml'))) {
    const doc = f.doc

    const paragraphBlockContainerEls = nodeListToArray(doc.getElementsByTagName('a:p')).filter((el) => {
      return (
        el.getAttribute('__block_helper_container__') === 'true' &&
        el.lastChild?.nodeName === '#comment' &&
        el.lastChild?.nodeValue === '__block_helper_container__'
      )
    })

    for (const paragraphNode of paragraphBlockContainerEls) {
      paragraphNode.removeAttribute('__block_helper_container__')

      const blockTextNodes = nodeListToArray(paragraphNode.getElementsByTagName('a:t')).filter((node) => {
        return node.getAttribute('__block_helper__') === 'true'
      })

      for (const textNode of blockTextNodes) {
        const rNode = textNode.parentNode
        let nextNode = rNode.nextSibling
        let nextRNode

        while (nextNode != null) {
          if (nextNode.nodeName === 'a:r') {
            nextRNode = nextNode
            break
          }

          nextNode = nextNode.nextSibling
        }

        if (nextRNode) {
          for (let idx = 0; idx < nextRNode.childNodes.length; idx++) {
            const childNode = nextRNode.childNodes[idx]

            // remove new line after the removed helper node
            if (childNode.nodeName === 'a:br' && childNode.getAttribute('a:type') === '') {
              nextRNode.removeChild(childNode)
            }
          }

          const childContentNodesLeft = nodeListToArray(nextRNode.childNodes).filter((node) => {
            if (node.nodeName === 'a:br') {
              const wType = node.getAttribute('a:type')

              return wType !== '' && ['column', 'textWrapping'].includes(wType) === false
            }

            return ['a:rPr', 'w:cr'].includes(node.nodeName) === false
          })

          if (childContentNodesLeft.length === 0) {
            // if there are no more content nodes in the w:r then remove it
            nextRNode.parentNode.removeChild(nextRNode)
          }
        }

        for (const node of nodeListToArray(rNode.childNodes)) {
          const valid = ['w:bookmarkStart', 'w:bookmarkEnd']

          if (!valid.includes(node.nodeName)) {
            continue
          }

          // move bookmark outside the w:r so it can be preserved
          rNode.parentNode.insertBefore(node, rNode)
        }

        rNode.parentNode.removeChild(rNode)
      }

      const childContentNodesLeft = nodeListToArray(paragraphNode.childNodes).filter((node) => {
        return ['a:r', 'w:fldSimple', 'w:hyperlink', 'w:bookmarkStart', 'w:bookmarkEnd'].includes(node.nodeName)
      })

      if (
        paragraphNode.lastChild != null &&
        paragraphNode.lastChild.nodeName === '#comment' &&
        paragraphNode.lastChild.nodeValue === '__block_helper_container__'
      ) {
        paragraphNode.removeChild(paragraphNode.lastChild)
      }

      if (childContentNodesLeft.length === 0) {
        // if there are no more content nodes in the paragraph then remove it
        paragraphNode.parentNode.removeChild(paragraphNode)
      }
    }
  }
}
