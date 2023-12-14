const Request = require('../shared/request')

module.exports = (obj) => {
  const targetObj = { ...obj }

  const originalData = targetObj.data

  delete targetObj.data

  const customOriginalInputDataIsEmptyResult = {
    defined: false,
    value: null
  }

  if (targetObj?.context != null && Object.hasOwn(targetObj.context, 'originalInputDataIsEmpty')) {
    customOriginalInputDataIsEmptyResult.defined = true
    customOriginalInputDataIsEmptyResult.value = targetObj.context.originalInputDataIsEmpty
  }

  const request = Request(targetObj)
  request.data = originalData

  if (customOriginalInputDataIsEmptyResult.defined) {
    request.context.originalInputDataIsEmpty = customOriginalInputDataIsEmptyResult.value
  } else {
    delete request.context.originalInputDataIsEmpty
  }

  return request
}
