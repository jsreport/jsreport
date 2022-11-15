
module.exports = async function checkDuplicatedId (store, collectionName, idValue, req) {
  if (idValue == null) {
    return
  }

  const existingEntity = await findEntity(store, collectionName, idValue, req)

  return existingEntity
}

async function findEntity (store, collectionName, idValue, req) {
  // we should validate without caring about permissions
  const existingEntity = await store.collection(collectionName).findOneAdmin({
    _id: idValue
  }, req)

  return existingEntity
}
