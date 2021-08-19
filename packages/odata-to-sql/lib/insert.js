var normalize = require('./normalize')

module.exports = function (doc, entitySetName, model) {
  return normalize(doc, entitySetName, model)
}
