module.exports = (callbackTimeout = 10000) => {
  const items = []
  let busy = false

  function execute () {
    if (items.length < 1 || busy) {
      return
    }

    busy = true
    const item = items[0]
    item.busy = true

    let r
    try {
      // properly handle also sync errors
      r = item.fn()
    } catch (e) {
      item.reject(e)
      items.shift()
      busy = false
      execute()
      return null
    }

    Promise.resolve(r).then((res) => {
      item.resolve(res)
      items.shift()
      busy = false
      execute()
      return null
    }).catch((err) => {
      item.reject(err)
      items.shift()
      busy = false
      execute()
      return null
    })
  }

  return {
    items,
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
        promise: result,
        submittedOn: new Date().getTime()
      })

      execute()
      return result
    },

    waitForAllSettled () {
      return Promise.allSettled(items.map(i => i.promise))
    },

    rejectItemsWithTimeout () {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const now = new Date().getTime()
        if (!item.busy && now > (items[i].submittedOn + callbackTimeout)) {
          items.splice(i, 1)
          item.reject(new Error('Timeout during waitinf for callback to main.'))
        }
      }
    }
  }
}
