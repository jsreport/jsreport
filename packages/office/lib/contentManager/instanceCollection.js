
module.exports = {
  createPart: createPartCollection
}

function createPartCollection (idAttrs, itemsStore) {
  return {
    addInstance (_baseKey, _newKey, data) {
      const baseKey = idAttrs.getValue(_baseKey)
      const newKey = idAttrs.getValue(_newKey)

      if (!itemsStore.baseItems.has(baseKey)) {
        throw new Error(`Base item with key ${baseKey} does not exist`)
      }

      itemsStore.upsertItem(baseKey, newKey, data)
    }
  }
}
