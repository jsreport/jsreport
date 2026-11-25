const { assertOk } = require('../../generationUtils')

module.exports.createLogicBlocks = createLogicBlocks

// keeps the tree of the logic block items (loops, conditions) evaluated while the data template
// is rendered, nested items are put as children of its parent item
function createLogicBlocks () {
  const items = []
  // the arguments (data and hash options written by the user) of the logic blocks,
  // they are evaluated once before the calls of the logic block
  const argsByKey = new Map()

  const getArgsKey = (hierarchyId, loopPath) => {
    return `${hierarchyId}|${loopPath ?? ''}`
  }

  return {
    setArgs (hierarchyId, loopPath, args) {
      argsByKey.set(getArgsKey(hierarchyId, loopPath), args)
    },
    getArgs (hierarchyId, loopPath) {
      return argsByKey.get(getArgsKey(hierarchyId, loopPath))
    },
    // puts the item in the tree (as child of its parent) and assigns its id. the hierarchyId is the
    // position of the block in the template, the id is the position of the item in the tree (the same
    // block can be evaluated many times, for example when it is inside a loop)
    register (logicBlockItem) {
      const parentLogicBlockItem = getParentItem(items, logicBlockItem, 'hierarchyId')
      const container = parentLogicBlockItem != null ? parentLogicBlockItem.children : items

      logicBlockItem.id = `${parentLogicBlockItem != null ? `${parentLogicBlockItem.id}#` : ''}${container.length}`

      container.push(logicBlockItem)
    }
  }
}

function getParentItem (items, childLogicBlockItem, targetId) {
  const parentTargetId = childLogicBlockItem[targetId].split('#').slice(0, -1).join('#')

  if (parentTargetId === '') {
    return
  }

  return getItemById(items, { idName: targetId, idValue: parentTargetId })
}

function getItemById (items, { idName, idValue }) {
  assertOk(idName === 'hierarchyId' || idName === 'id', 'idName should be either "hierarchyId" or "id"')
  assertOk(typeof idValue === 'string', 'idValue should be a string')

  const idParts = idValue.split('#')
  let ctx = { children: items }
  let targetIdValue = ''
  let parent

  while (idParts.length > 0) {
    const idx = idParts.shift()

    targetIdValue = targetIdValue !== '' ? `${targetIdValue}#${idx}` : `${idx}`

    const matches = ctx.children.filter((c) => c[idName] === targetIdValue)
    const result = matches[matches.length - 1]

    if (result == null) {
      break
    }

    ctx = result

    if (idParts.length === 0) {
      parent = ctx
    }
  }

  return parent
}
