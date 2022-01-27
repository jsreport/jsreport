const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')

module.exports.basename = path.basename

module.exports.generateTmpId = () => {
  return nanoid(7)
}

module.exports.write = function (tmp, data) {
  const file = path.join(tmp, `${nanoid(7)}.html`)
  fs.writeFileSync(file, data)
  return file
}
