const { customAlphabet } = require('nanoid')

const nanoid = customAlphabet('0123456789abcdef', 32)

module.exports = () => {
  const id = nanoid()
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}
