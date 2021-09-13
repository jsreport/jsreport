
module.exports = (persistenceQueueWaitingTimeout) => {
  const items = []
  let busy = false

  function execute () {
    if (items.length < 1 || busy) {
      return
    }

    busy = true
    const item = items.shift()
    item.busy = true

    Promise.resolve(item.fn()).then((res) => {
      item.resolve(res)
      busy = false
      execute()
      return null
    }).catch((err) => {
      item.reject(err)
      busy = false
      execute()
      return null
    })
  }

  return {
    push (fn) {
      let _resolve, _reject
      const result = new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
      items.push({
        fn,
        resolve: _resolve,
        reject: _reject,
        submittedOn: new Date().getTime()
      })

      execute()
      return result
    },

    rejectItemsWithTimeout () {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const now = new Date().getTime()
        if (!item.busy && now > (items[i].submittedOn + persistenceQueueWaitingTimeout)) {
          items.splice(i, 1)
          item.reject(new Error('Timeout during waiting for file system, try it again later.'))
        }
      }
    }
  }
}
