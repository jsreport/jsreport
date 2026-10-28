const { assertOk } = require('../../generationUtils')

module.exports.createLastRef = createLastRef

// keeps the last row/column processed in the template and the row/column generated for it,
// the new numbers of rows and cells are calculated from it (it acts like a cursor that follows
// the sequence of rows/cells processed in the data template)
function createLastRef () {
  const original = { row: null, column: null }
  const current = { row: null, column: null }

  const getNext = (target, originalNumber) => {
    assertTarget(target)

    const lastOriginalNumber = original[target]
    const lastNumber = current[target]

    // when nothing has been processed yet, the number is the same than in the template
    if (lastOriginalNumber == null) {
      return originalNumber
    }

    // when the number of the template is bigger than the last one processed, the content advances,
    // the distance with the last one is kept (the empty rows/columns of the template are preserved)
    if (originalNumber > lastOriginalNumber) {
      return lastNumber + (originalNumber - lastOriginalNumber)
    }

    // when the number of the template is the same or lower than the last one processed,
    // the content of the template is being repeated (loop iterations),
    // so the content continues just after the last number generated
    return lastNumber + 1
  }

  return {
    // the last row/column generated
    getCurrent () {
      return { ...current }
    },
    // the number to generate for the row/column of the template
    getNext,
    update (target, originalNumber, number) {
      assertTarget(target)

      original[target] = originalNumber
      current[target] = number
    }
  }
}

function assertTarget (target) {
  assertOk(target === 'row' || target === 'column', `Invalid target "${target}" for last ref`)
}
