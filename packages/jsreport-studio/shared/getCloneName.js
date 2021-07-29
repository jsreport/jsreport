
module.exports = function (entityName) {
  if (entityName.indexOf('.') !== -1) {
    return entityName.slice(0, entityName.indexOf('.')) + '(clone)' + entityName.slice(entityName.indexOf('.'))
  } else {
    return entityName + '(clone)'
  }
}
