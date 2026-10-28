
module.exports.createDimension = createDimension

function createDimension (templateDimension) {
  let rendered = null

  return {
    // grows the range (if needed) so it also covers the cell
    include (cellNumbers) {
      if (cellNumbers.rowNumber == null && cellNumbers.columnNumber == null) {
        throw new Error('cellNumbers must have at least rowNumber or columnNumber properties defined')
      }

      if (rendered == null) {
        rendered = {
          start: { ...cellNumbers },
          end: { ...cellNumbers }
        }

        return
      }

      const { start, end } = rendered

      start.rowNumber = Math.min(start.rowNumber, cellNumbers.rowNumber)
      start.columnNumber = Math.min(start.columnNumber, cellNumbers.columnNumber)
      end.rowNumber = Math.max(end.rowNumber, cellNumbers.rowNumber)
      end.columnNumber = Math.max(end.columnNumber, cellNumbers.columnNumber)
    },
    // the range of the rendered cells, if no cell was rendered it is the dimension of the template
    get () {
      return rendered ?? templateDimension
    }
  }
}
