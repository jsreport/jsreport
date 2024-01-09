import { applyPatch } from 'diff'
import b64toBlob from './b64toBlob'

function getStateAtProfileOperation (operations, operationId, completed = false) {
  const operation = operations.find((op) => op.id === operationId)
  if (operation == null) {
    throw new Error(`Operation with id "${operationId}" not found, not able to get state`)
  }

  const allEvents = operations.map(op => [op.startEvent, op.endEvent]).flat().filter(e => e)
  let currentEvent = completed ? operation.endEvent : operation.startEvent
  const eventsToDiff = currentEvent.doDiffs === false ? [] : [currentEvent]

  while (currentEvent.previousEventId != null) {
    currentEvent = allEvents.find((e) => e.id === currentEvent.previousEventId)
    if (currentEvent.doDiffs !== false) {
      eventsToDiff.push(currentEvent)
    }
  }
  eventsToDiff.reverse()

  const currentState = {
    reqContent: '',
    resContent: '',
    resContentEncoding: '',
    resMetaContent: ''
  }

  for (const event of eventsToDiff) {
    if (currentState.reqTooLarge || event.req.tooLarge) {
      currentState.reqTooLarge = true
    } else {
      currentState.reqContent = applyPatch(currentState.reqContent, event.req.diff)
    }

    currentState.resMetaContent = applyPatch(currentState.resMetaContent, event.res.meta.diff)

    if (currentState.resContentTooLarge) {
      continue
    }

    if (event.res.content) {
      if (event.res.content.tooLarge) {
        currentState.resContentTooLarge = true
      } else {
        currentState.resContentEncoding = event.res.content.encoding
        if (event.res.content.encoding === 'diff') {
          currentState.resContent = applyPatch(currentState.resContent, event.res.content.content)
        } else {
          currentState.resContent = event.res.content.content
        }
      }
    } else if (currentState.resContent !== '' && !event.res.content) {
      // if we get here it means we are getting from a previous response with content to a new empty one
      // which likely means a new render started
      currentState.resContent = ''
      currentState.resContentEncoding = ''
    }
  }

  const result = { req: {}, res: {} }
  try {
    result.res.meta = JSON.parse(currentState.resMetaContent)
  } catch (e) {
    console.error('Failed to parse meta ' + currentState.resMetaContent)
  }

  if (result.res.meta.contentType == null) {
    result.res.meta.contentType = 'text/plain'
  }

  if (result.res.meta.fileExtension == null) {
    result.res.meta.fileExtension = 'txt'
  }

  if (currentState.reqTooLarge) {
    result.req = { tooLarge: true }
  } else {
    try {
      result.req = JSON.parse(currentState.reqContent)
    } catch (e) {
      console.error('Failed to parse req ' + currentState.reqContent)
    }
  }

  if (currentState.resContentTooLarge === true) {
    result.res.content = {
      tooLarge: true
    }
  } else {
    if (currentState.resContentEncoding === 'base64') {
      result.res.content = b64toBlob(currentState.resContent, result.res.meta.contentType)
    } else {
      result.res.content = new Blob([currentState.resContent], { type: result.res.meta.contentType })
    }
  }

  return result
}

export default getStateAtProfileOperation
