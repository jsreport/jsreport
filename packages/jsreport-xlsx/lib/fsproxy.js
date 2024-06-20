const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const { nanoid } = require('nanoid')
const zlib = require('zlib')

module.exports.write = (tmp, data) => {
  const file = path.join(tmp, `${nanoid()}.xml'`)

  mkdirp.sync(tmp)

  fs.writeFileSync(file, zlib.deflateSync(data))
  return file
}
