const omit = require('lodash.omit')
const Request = require('../../shared/request')

module.exports = async function checkDuplicatedId (store, collectionName, idValue, req) {
  if (idValue == null) {
    return
  }

  const existingEntity = await findEntity(store, collectionName, idValue, req)

  return existingEntity
}

async function findEntity (store, collectionName, idValue, req) {
  const localReq = req ? Request(req) : req

  // we should validate without caring about permissions
  if (localReq) {
    localReq.context = localReq.context ? omit(localReq.context, 'user') : localReq.context
  }

  const existingEntity = await store.collection(collectionName).findOne({
    _id: idValue
  }, localReq)

  return existingEntity
}
