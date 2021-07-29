const jsdiff = require('diff')
const gdiff = new (require('diff-match-patch'))()

function formatPatch (diff) {
  const ret = []
  if (diff.oldFileName === diff.newFileName) {
    ret.push('Index: ' + diff.oldFileName)
  }
  ret.push('===================================================================')
  ret.push('--- ' + diff.oldFileName + (typeof diff.oldHeader === 'undefined' ? '' : '\t' + diff.oldHeader))
  ret.push('+++ ' + diff.newFileName + (typeof diff.newHeader === 'undefined' ? '' : '\t' + diff.newHeader))

  for (let i = 0; i < diff.hunks.length; i++) {
    const hunk = diff.hunks[i]
    ret.push(
      '@@ -' + hunk.oldStart + ',' + hunk.oldLines +
            ' +' + hunk.newStart + ',' + hunk.newLines +
            ' @@'
    )
    ret.push.apply(ret, hunk.lines)
  }

  const res = ret.join('\n') + '\n'
  return res
}

function createPatch (name, older, newer, context) {
  const { chars1, chars2, lineArray } = gdiff.diff_linesToChars_(older, newer)
  const cdiff = gdiff.diff_main(chars1, chars2, false)
  gdiff.diff_charsToLines_(cdiff, lineArray)

  const diff = cdiff.map(([op, data]) => {
    const r = { value: data }
    if (op === 1) {
      r.added = true
    }
    if (op === -1) {
      r.removed = true
    }
    return r
  })

  diff.push({ value: '', lines: [] }) // Append an empty value to make cleanup easier

  function contextLines (lines) {
    return lines.map(function (entry) { return ' ' + entry })
  }

  const hunks = []
  let oldRangeStart = 0
  let newRangeStart = 0
  let curRange = []

  let oldLine = 1; let newLine = 1
  for (let i = 0; i < diff.length; i++) {
    const current = diff[i]

    const lines = current.lines || current.value.replace(/\n$/, '').split('\n')
    current.lines = lines

    if (current.added || current.removed) {
      // If we have previous context, start with that
      if (!oldRangeStart) {
        const prev = diff[i - 1]
        oldRangeStart = oldLine
        newRangeStart = newLine

        if (prev) {
          curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : []
          oldRangeStart -= curRange.length
          newRangeStart -= curRange.length
        }
      }

      // Output our changes
      curRange.push(...lines.map(function (entry) {
        return (current.added ? '+' : '-') + entry
      }))

      // Track the updated file position
      if (current.added) {
        newLine += lines.length
      } else {
        oldLine += lines.length
      }
    } else {
      // Identical context lines. Track line changes
      if (oldRangeStart) {
        // Close out any changes that have been output (or join overlapping)
        if (lines.length <= context * 2 && i < diff.length - 2) {
          // Overlapping
          curRange.push(...contextLines(lines))
        } else {
          // end the range and output
          const contextSize = Math.min(lines.length, context)
          curRange.push(...contextLines(lines.slice(0, contextSize)))

          const hunk = {
            oldStart: oldRangeStart,
            oldLines: (oldLine - oldRangeStart + contextSize),
            newStart: newRangeStart,
            newLines: (newLine - newRangeStart + contextSize),
            lines: curRange
          }
          if (i >= diff.length - 2 && lines.length <= context) {
            // EOF is inside this hunk
            const oldEOFNewline = (/\n$/.test(older))
            const newEOFNewline = (/\n$/.test(newer))
            const noNlBeforeAdds = lines.length === 0 && curRange.length > hunk.oldLines
            if (!oldEOFNewline && noNlBeforeAdds) {
              // special case: old has no eol and no trailing context; no-nl can end up before adds
              curRange.splice(hunk.oldLines, 0, '\\ No newline at end of file')
            }
            if ((!oldEOFNewline && !noNlBeforeAdds) || !newEOFNewline) {
              curRange.push('\\ No newline at end of file')
            }
          }
          hunks.push(hunk)

          oldRangeStart = 0
          newRangeStart = 0
          curRange = []
        }
      }
      oldLine += lines.length
      newLine += lines.length
    }
  }

  return formatPatch({
    oldFileName: name,
    newFileName: name,
    hunks: hunks
  })
}

module.exports.applyPatch = (prev, patch) => jsdiff.applyPatch(prev, patch)
module.exports.createPatch = createPatch
