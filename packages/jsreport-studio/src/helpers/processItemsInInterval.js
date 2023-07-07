
function processItemsInInterval ({ baseInterval, queue, fulfilledCheck, handler }) {
  const processingExecution = {}

  processingExecution.promise = new Promise((resolve, reject) => {
    processingExecution.resolve = resolve
    processingExecution.reject = reject
  })

  setTimeout(function processItemsInQueue () {
    const isFulfilled = fulfilledCheck()
    let shouldContinue = !isFulfilled || queue.length > 0
    let nextInterval = baseInterval

    if (queue.length > 0) {
      let nextIntervalFromHandler

      try {
        nextIntervalFromHandler = handler(queue, isFulfilled)
      } catch (handlerErr) {
        processingExecution.reject(handlerErr)
        return
      }

      if (nextIntervalFromHandler != null) {
        nextInterval = nextIntervalFromHandler
      }

      shouldContinue = !fulfilledCheck() || queue.length > 0
    }

    if (shouldContinue) {
      setTimeout(processItemsInQueue, nextInterval)
    } else {
      processingExecution.resolve()
    }
  }, baseInterval)

  return processingExecution.promise
}

export default processItemsInInterval
