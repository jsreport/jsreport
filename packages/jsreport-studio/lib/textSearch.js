const _ = require('lodash')
const isbinaryfile = require('isbinaryfile').isBinaryFileSync
const { findAll } = require('highlight-words-core')
const race = require('race-as-promised')

module.exports = function createTextSearch (reporter) {
  const entitySetsForTextSearch = []

  for (const [entitySetName, entitySetInfo] of Object.entries(reporter.documentStore.model.entitySets)) {
    const documentProps = []
    const pendingTypes = [{ typeDef: entitySetInfo.entityTypeDef }]

    do {
      const { typeDef: currentTypeDef, parent = [] } = pendingTypes.shift()

      for (const [propName, propDef] of Object.entries(currentTypeDef)) {
        const fullPropParts = [...parent, propName]
        const resolveResult = reporter.documentStore.resolvePropertyDefinition(propDef)

        if (!resolveResult) {
          continue
        }

        if (resolveResult.subType) {
          pendingTypes.push({
            typeDef: resolveResult.subType,
            parent: fullPropParts
          })
        } else if (resolveResult.def.document != null) {
          documentProps.push({
            name: fullPropParts.join('.'),
            def: resolveResult.def
          })
        }
      }
    } while (pendingTypes.length > 0)

    if (documentProps.length > 0) {
      entitySetsForTextSearch.push({
        entitySet: entitySetName,
        documentProps
      })
    }
  }

  async function textSearch (reporter, req, text, step) {
    let matchesCount = 0
    let entitiesCount = 0
    const results = []
    const pending = new Map()

    for (const info of entitySetsForTextSearch) {
      pending.set(info.entitySet, { skip: 0, documentProps: info.documentProps })
    }

    do {
      const queries = []

      for (const [entitySet, info] of pending.entries()) {
        queries.push(
          reporter.documentStore.collection(entitySet).find({}, info.documentProps.reduce((acu, currentProp) => {
            acu[currentProp.name] = 1
            return acu
          }, {
            _id: 1,
            shortid: 1,
            name: 1,
            folder: 1
          }), req).skip(info.skip).limit(step).toArray().then((entities) => ({ entitySet, entities }))
        )
      }

      for await (const { entitySet, entities } of getPromiseResultsAsAvailable(queries)) {
        const info = pending.get(entitySet)
        info.skip = info.skip + step

        for (const entity of entities) {
          const docPropMatches = []

          for (const docProp of info.documentProps) {
            let content = _.get(entity, docProp.name)

            if (content == null || content === '') {
              continue
            }

            if (typeof content !== 'string') {
              const isBuffer = Buffer.isBuffer(content)

              if (isBuffer) {
                if (isbinaryfile(content)) {
                  continue
                }

                content = content.toString()
              } else {
                content = String(content)
              }
            }

            const matches = findAll({
              searchWords: [text],
              textToHighlight: content,
              autoEscape: true,
              caseSensitive: false
            })

            const highlightedMatches = getHighlightedMatches(matches)

            if (highlightedMatches.length === 0) {
              continue
            }

            const contentByLines = splitByLinesKeepingLine(content)
            const lineMatches = getLineMatches(text, contentByLines, highlightedMatches)

            matchesCount += lineMatches.length

            docPropMatches.push({
              docProp: docProp.name,
              lineMatches
            })
          }

          if (docPropMatches.length > 0) {
            const entityPath = await reporter.folders.resolveEntityPath(entity, entitySet, req)

            results.push({
              entitySet,
              entityPath,
              entity: {
                _id: entity._id,
                shortid: entity.shortid,
                name: entity.name
              },
              docPropMatches
            })

            entitiesCount++
          }
        }

        if (entities.length === 0 || entities.length < step) {
          pending.delete(entitySet)
        }
      }
    } while (pending.size > 0)

    return {
      matchesCount,
      entitiesCount,
      results
    }
  }

  textSearch.entitySetsForTextSearch = entitySetsForTextSearch

  return textSearch
}

async function * getPromiseResultsAsAvailable (promises) {
  const pending = promises.map((p, idx) => p.then((result) => ({ idx, result })))
  const idxPromisesMap = new Map(pending.map((p, idx) => [idx, p]))

  do {
    // here just a reminder: when using Promise.race we should be very careful, the standard
    // implementation basically adds a new .then() call to the promises passed, when we do
    // this in a loop (like in this case) it basically means that the longer the loop keeps
    // going it will continue to add more and more .then() calls to the promises, this is likely
    // not a problem here but it is a bit of overhead that we can avoid by using a
    // safer/custom Promise.race that does not suffer from this problem, full details here:
    // https://github.com/nodejs/node/issues/17469
    // To recap: Promise.race can produce memory leaks when used in a loop and when some of the
    // promises passed never resolves because on each loop a new then callback will be queued
    const resolvedInfo = await race(pending)
    const resolvedPromise = idxPromisesMap.get(resolvedInfo.idx)
    const currentIdx = pending.findIndex((p) => p === resolvedPromise)
    pending.splice(currentIdx, 1)
    yield resolvedInfo.result
  } while (pending.length > 0)
}

function getLineMatches (searchTerm, contentByLines, highlightedMatches) {
  const pending = [...highlightedMatches]
  const results = []
  let currentLineIdx = 0
  let currentCharacterOffset = 0
  let currentLineMatch = null

  while (pending.length > 0) {
    // the .end in the match points to the next character after the match,
    // so we normalize it here
    const match = { start: pending[0].start, end: pending[0].end - 1 }
    const currentLine = contentByLines[currentLineIdx]

    const currentLineRange = { start: currentCharacterOffset, end: currentCharacterOffset + (currentLine.length - 1) }
    const matchingOnStart = match.start >= currentLineRange.start && match.start <= currentLineRange.end
    const matchingOnEnd = match.end >= currentLineRange.start && match.end <= currentLineRange.end

    if (matchingOnStart) {
      const matchBasedOnLine = {
        // passing start, end based on the indexes of the current line
        start: match.start - currentLineRange.start,
        end: match.end - currentLineRange.start
      }

      currentLineMatch = {
        startCharacter: matchBasedOnLine.start,
        preview: getPreviewFromMatch(searchTerm, currentLine, matchBasedOnLine),
        start: currentLineIdx + 1
      }
    }

    // when a match is resolved we don't move the next line
    // because it can be the case the there are multiple matches on same line,
    // so we just store the found match and continue in loop to evaluate if
    // the next match is compatible with current line
    if (matchingOnEnd) {
      // if the search term ends with a new line we need to count that line too
      if (searchTerm[searchTerm.length - 1] === '\n') {
        currentLineMatch.end = currentLineIdx + 2
        currentLineMatch.endCharacter = 1
      } else {
        currentLineMatch.end = currentLineIdx + 1
        currentLineMatch.endCharacter = (match.end + 1) - currentLineRange.start
      }

      pending.shift()
      results.push(currentLineMatch)
      currentLineMatch = null
    } else {
      currentCharacterOffset = currentLineRange.end + 1
      currentLineIdx++
    }
  }

  return results
}

const nonWhiteSpaceRegex = /[^ \t]/

function getPreviewFromMatch (searchTerm, line, matchBasedOnLine) {
  const maxStart = 28
  const maxLength = 250
  const maxIdxStart = maxStart - 1
  const newMatchBasedOnLine = { start: matchBasedOnLine.start, end: matchBasedOnLine.end }
  let previewText = line
  let occurrence = -1

  if (matchBasedOnLine.start > maxIdxStart) {
    const newStartIdx = matchBasedOnLine.start - maxIdxStart
    newMatchBasedOnLine.start -= newStartIdx
    newMatchBasedOnLine.end -= newStartIdx
    previewText = line.slice(newStartIdx)
  }

  if (previewText[previewText.length - 1] === '\n') {
    // we don't count this as removed characters because it is last part of the
    // string and it does not count for changing the matchFromLine indexes
    previewText = previewText.slice(0, previewText[previewText.length - 2] === '\r' ? -2 : -1)
  }

  const match = previewText.match(nonWhiteSpaceRegex)

  // only slice if the match is not at the beginning
  if (match != null && match.index !== 0) {
    let newIdx = match.index

    // and if it does not conflict with
    // part of the match (like in the case when you use white space in the search term)
    // if it conflicts starts the preview from the match
    if (newIdx > newMatchBasedOnLine.start) {
      newIdx = newMatchBasedOnLine.start
    }

    newMatchBasedOnLine.start -= newIdx
    newMatchBasedOnLine.end -= newIdx
    previewText = previewText.slice(newIdx)
  }

  let highlightedMatches

  // if the end of the match is not on the preview then
  // it means we should highlight the whole preview text
  // (this happens when you search a text with a line break at the end)
  if (newMatchBasedOnLine.end > previewText.length - 1) {
    highlightedMatches = [{ start: 0, end: previewText.length }]
    occurrence = 0
  } else {
    const matches = findAll({
      searchWords: [searchTerm],
      textToHighlight: previewText,
      autoEscape: true,
      caseSensitive: false
    })

    highlightedMatches = getHighlightedMatches(matches)

    if (highlightedMatches.length > 0) {
      occurrence = highlightedMatches.findIndex((match) => match.start === newMatchBasedOnLine.start)
    }
  }

  let previewMatch

  if (occurrence !== -1) {
    previewMatch = {
      start: highlightedMatches[occurrence].start,
      end: highlightedMatches[occurrence].end
    }
  }

  const shouldTrim = previewText.length > maxLength

  if (shouldTrim) {
    let startingIdx = 0
    const endingIdx = maxLength - 1

    if (occurrence !== -1) {
      const matchStillOnPreview = (
        newMatchBasedOnLine.start >= startingIdx &&
        newMatchBasedOnLine.start <= endingIdx &&
        newMatchBasedOnLine.end >= startingIdx &&
        newMatchBasedOnLine.end <= endingIdx
      )

      if (!matchStillOnPreview) {
        startingIdx = newMatchBasedOnLine.start
        previewMatch.start -= startingIdx
        previewMatch.end -= startingIdx
      }
    }

    previewText = previewText.slice(startingIdx, startingIdx + maxLength)

    // when the search term is longer then the preview text then we update
    // the highlighted match to be the first occurrence
    if (searchTerm.length > previewText.length) {
      occurrence = 0
      previewMatch.start = 0
      previewMatch.start = maxLength
    }
  }

  const result = {
    text: previewText
  }

  if (previewMatch != null) {
    result.match = previewMatch
  }

  return result
}

function getHighlightedMatches (matches) {
  const highlightedMatches = []

  for (const match of matches) {
    const { highlight, ...rest } = match

    if (highlight) {
      highlightedMatches.push({ ...rest })
    }
  }

  return highlightedMatches
}

function splitByLinesKeepingLine (string) {
  const parts = string.split(/(\r?\n)/)
  const lines = []

  for (let index = 0; index < parts.length; index += 2) {
    lines.push(parts[index] + (parts[index + 1] || ''))
  }

  return lines
}
