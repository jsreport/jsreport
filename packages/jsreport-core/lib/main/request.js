const extend = require('node.extend.without.arrays')

module.exports = (obj) => {
  const request = Object.create({}, {
    __isJsreportRequest__: {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false
    }
  })

  request.template = extend(true, {}, obj.template)

  request.options = extend(true, {}, request.options, obj.options)
  request.context = extend(true, {}, request.context, obj.context)
  request.context.shared = extend(true, {}, request.context.shared)
  request.data = obj.data

  return request
}
