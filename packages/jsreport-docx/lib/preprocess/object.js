const { normalizeSingleTextElInRun, normalizeSingleContentInText, nodeListToArray, getClosestEl } = require('../utils')

const instanceIdRegExp = /(\d+)$/

module.exports = (files, headerFooterRefs, sharedData) => {
  const documentFile = files.find(f => f.path === 'word/document.xml')
  const toProcess = [{ doc: documentFile.doc, path: documentFile.path }]

  for (const rResult of headerFooterRefs) {
    toProcess.push({ doc: rResult.doc, path: rResult.path })
  }

  for (const { doc: targetDoc, path: targetPath } of toProcess) {
    const shapeTypeFromItems = {
      getIds: () => nodeListToArray(targetDoc.getElementsByTagName('v:shapetype')).map((el) => el.getAttribute('o:spt')),
      getNumberId: getShapeTypeNumberId
    }

    sharedData.localIdManagers(targetPath).set('shapeType', {
      fromItems: shapeTypeFromItems
    })

    const shapeFromItems = {
      getIds: () => nodeListToArray(targetDoc.getElementsByTagName('v:shape')).map((el) => el.getAttribute('id')),
      getNumberId: getShapeNumberId
    }

    if (!sharedData.idManagers.has('shape')) {
      sharedData.idManagers.set('shape', {
        fromItems: shapeFromItems
      })
    } else {
      sharedData.idManagers.get('shape').updateFromItems(shapeFromItems)
    }

    const docxObjectTextElements = nodeListToArray(targetDoc.getElementsByTagName('w:t')).filter((tEl) => {
      return tEl.textContent.includes('{{docxObject')
    })

    // first we normalize that w:r elements containing the docxObject calls only contain one child w:t element
    // usually office does not generated documents like this but it is valid that
    // the w:r element can contain multiple w:t elements
    for (const textEl of docxObjectTextElements) {
      normalizeSingleTextElInRun(textEl, targetDoc)
    }

    // now we normalize that docxObject calls are in its own w:t element and other text
    // is split into new w:t element
    for (const textEl of docxObjectTextElements) {
      const normalizedResults = normalizeSingleContentInText(textEl, getDocxObjectCallRegexp, targetDoc)

      if (normalizedResults == null) {
        continue
      }

      for (const normalizedResult of normalizedResults) {
        const { tEl, match } = normalizedResult

        if (match == null) {
          continue
        }

        const fakeElement = targetDoc.createElement('docxRemove')
        fakeElement.textContent = match.content

        const runEl = getClosestEl(tEl, 'w:r')

        runEl.parentNode.replaceChild(fakeElement, runEl)
      }
    }
  }
}

function getShapeTypeNumberId (shapeTypeId) {
  const typeCounter = parseInt(shapeTypeId, 10)

  if (isNaN(typeCounter)) {
    return
  }

  return typeCounter
}

function getShapeNumberId (shapeId) {
  const result = instanceIdRegExp.exec(shapeId)

  if (result == null) {
    return
  }

  const instanceCounter = parseInt(result[1], 10)

  if (isNaN(instanceCounter)) {
    return
  }

  return instanceCounter
}

function getDocxObjectCallRegexp () {
  return /{{docxObject [^{}]{0,500}}}/
}
