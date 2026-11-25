module.exports.buildDataRanges = buildDataRanges

// groups the rows of the sheet in ranges of consecutive rows that are either static or dynamic (contain
// handlebars tags or are part of a logic block), the static ranges are rendered with a simpler helper call
function buildDataRanges (parsedRows) {
  const dataRanges = []

  for (const parsedRow of parsedRows.values()) {
    const isDynamic = parsedRow.hasDynamicContent || parsedRow.isPartOfLogicBlock

    const type = isDynamic ? 'dynamic' : 'static'
    let lastRange = dataRanges[dataRanges.length - 1]

    if (lastRange == null || lastRange.type !== type) {
      lastRange = {
        type,
        items: new Set()
      }

      dataRanges.push(lastRange)
    }

    lastRange.items.add(parsedRow.number)
  }

  return dataRanges
}
