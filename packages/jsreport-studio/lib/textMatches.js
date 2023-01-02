const _ = require('lodash')
const isbinaryfile = require('isbinaryfile').isBinaryFileSync
const { findAll } = require('highlight-words-core')

module.exports = async function textMatches ({ text, documentProps, entities }) {
  const entitiesMatches = []

  for (const entity of entities) {
    const docPropMatches = []

    for (const docProp of documentProps) {
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

      docPropMatches.push({
        docProp: docProp.name,
        lineMatches
      })
    }

    if (docPropMatches.length > 0) {
      entitiesMatches.push({
        entity,
        docPropMatches
      })
    }
  }

  return entitiesMatches
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
