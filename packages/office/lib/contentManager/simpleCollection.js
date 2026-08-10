
module.exports = {
  createPartCollection,
  onSetup: (baseItems, partCollection) => {
    // for a simple collection the base items should already exists on the
    // collection from the start
    for (const baseItemId of baseItems.keys()) {
      partCollection.set(baseItemId, {})
    }
  }
}

function createPartCollection (idAttrs, itemsStore) {
  return {
    set (_key, data) {
      const key = idAttrs.getValue(_key)
      let baseKey

      if (!itemsStore.items.has(key) && itemsStore.baseItems.has(key)) {
        baseKey = key
      }

      itemsStore.upsertItem(baseKey, key, data)
    }
  }
}
