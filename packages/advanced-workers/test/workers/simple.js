const workerState = {
  counter: 0
}
module.exports = (initData) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      workerState.counter++
      return {
        actionData: data,
        initData: initData,
        workerState
      }
    }
  }
}
