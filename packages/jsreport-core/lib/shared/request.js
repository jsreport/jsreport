const extend = require('node.extend.without.arrays')
const omit = require('lodash.omit')
const createError = require('./createError')

module.exports = (obj, parent) => {
  if (parent && !parent.__isJsreportRequest__) {
    throw new Error('Invalid parent request passed')
  }

  const request = Object.create({}, {
    __isJsreportRequest__: {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false
    }
  })

  if (obj.rawContent) {
    request.rawContent = obj.rawContent
  }

  request.template = extend(true, {}, obj.template)

  if (parent) {
    request.context = Object.assign({}, request.context, omit(parent.context, ['id', 'logs']))
    request.context.isChildRequest = true
    request.options = Object.assign({}, request.options, parent.options)

    if (parent.data) {
      const dataInput = normalizeJSONData(parent.data)
      request.data = Object.assign(Array.isArray(dataInput) ? [] : {}, dataInput)
    }
  }

  request.options = extend(true, {}, request.options, obj.options)
  request.context = extend(true, {}, request.context, obj.context)
  request.context.shared = extend(true, {}, request.context.shared)

  if (obj.data) {
    const dataInput = normalizeJSONData(obj.data)
    request.data = Object.assign(Array.isArray(dataInput) ? [] : {}, request.data, dataInput)

    // don't override value if it was already set by caller
    if (obj.context == null || obj.context.originalInputDataIsEmpty == null) {
      request.context.originalInputDataIsEmpty = false
    }
  } else if (!parent) {
    // don't override value if it was already set by caller
    if (obj.context == null || obj.context.originalInputDataIsEmpty == null) {
      request.context.originalInputDataIsEmpty = true
    }
  }

  // initialize data if it is empty
  if (!request.data) {
    request.data = {}
  }

  return request
}

function normalizeJSONData (data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (parseError) {
      throw createError('Unable to parse request data', {
        weak: true,
        original: parseError
      })
    }
  }

  return data
}
