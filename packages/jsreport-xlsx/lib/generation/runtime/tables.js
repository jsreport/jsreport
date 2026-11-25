module.exports.createTables = createTables

// keeps the instances of the tables of the sheet generated while the data template is rendered, a table
// inside a loop generates an instance for each iteration of the loop. it receives the tables of the sheet
function createTables (tables) {
  const instancesByTable = new Map()

  const getLastInstance = (tablePartData) => {
    const instances = instancesByTable.get(tablePartData.idx)
    return instances?.[instances.length - 1]
  }

  return {
    // keeps the new ref of a cell that is part of a table ref, the start of the main ref of the table
    // starts a new instance of the table when it is rendered in a new loop iteration (loopPath)
    includeRefCell (tablePartData, { originalCellRef, cellRef, loopPath }) {
      const tablePart = tables[tablePartData.idx]
      const isMainRef = tablePart.mainRefParts.join(':') === tablePartData.ref
      const isStartOfRange = tablePartData.ref.split(':')[0] === originalCellRef

      if (!instancesByTable.has(tablePartData.idx)) {
        instancesByTable.set(tablePartData.idx, [])
      }

      let tableInstance = getLastInstance(tablePartData)

      if (isMainRef && isStartOfRange) {
        const instanceId = loopPath ?? 'root'

        if (tableInstance == null || tableInstance.id !== instanceId) {
          tableInstance = {
            id: instanceId,
            columnNames: new Map(),
            refsParts: new Map()
          }

          instancesByTable.get(tablePartData.idx).push(tableInstance)
        }
      }

      if (!tableInstance.refsParts.has(tablePartData.ref)) {
        tableInstance.refsParts.set(tablePartData.ref, { start: null, end: null })
      }

      const partsOfRef = tableInstance.refsParts.get(tablePartData.ref)

      if (isStartOfRange) {
        partsOfRef.start = cellRef
      } else {
        partsOfRef.end = cellRef
      }
    },
    // keeps the rendered name of a dynamic column of the table
    setColumnName (tablePartData, originalCellRef, name) {
      getLastInstance(tablePartData).columnNames.set(originalCellRef, name)
    },
    // the tables that were rendered with their instances
    getRendered () {
      return [...instancesByTable.entries()].map(([tableIdx, instances]) => ({
        tablePart: tables[tableIdx],
        instances
      }))
    }
  }
}
