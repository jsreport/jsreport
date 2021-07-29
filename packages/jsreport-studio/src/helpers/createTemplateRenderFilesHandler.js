
function createTemplateRenderFilesHandler (opts) {
  const { onLog, onOperation, onError, onReport, batchCompleted, profiling = true } = opts

  const logHandler = createExecutionHandler('log', onLog, { disabled: !profiling })
  const operationHandler = createExecutionHandler('operation', onOperation, { disabled: !profiling })
  const reportHandler = createExecutionHandler('report', onReport, { parse: false })
  const errorHandler = createExecutionHandler('error', onError)

  const processFiles = (files, pendingFiles) => {
    for (const fileInfo of files) {
      try {
        if (fileInfo.name === 'report') {
          reportHandler(fileInfo)
        } else if (fileInfo.name === 'log') {
          logHandler(fileInfo)
        } else if (fileInfo.name === 'operationStart' || fileInfo.name === 'operationEnd') {
          operationHandler(fileInfo)
        } else if (fileInfo.name === 'error') {
          errorHandler(fileInfo)
        }
      } catch (e) {
        console.error(`Error during file callback of "${fileInfo.name}" entry`, e)
      }
    }

    if (batchCompleted) {
      batchCompleted(pendingFiles)
    }
  }

  return processFiles
}

function createExecutionHandler (type, handler, { parse = true, disabled = false } = {}) {
  return (fileInfo) => {
    if (disabled) {
      return
    }

    return executeHandler(type, fileInfo, parse, handler)
  }
}

function executeHandler (type, fileInfo, parse, handler) {
  if (handler == null) {
    return
  }

  const data = parse ? parseRawToObject(type, fileInfo) : fileInfo

  if (data == null) {
    return
  }

  try {
    handler(data)
    return data
  } catch (e) {
    console.warn(`Unable to execute ${type} handler. Error: ${e.message}`)
  }
}

function parseRawToObject (type, fileInfo) {
  try {
    const result = JSON.parse(new TextDecoder().decode(fileInfo.rawData))
    return result
  } catch (e) {
    console.warn(`Unable to parse profile ${type}. Error: ${e.message}`)
  }
}

export default createTemplateRenderFilesHandler
