let running = false

module.exports = (initData) => {
  return {
    init: () => {
    },

    execute: (data) => {
      if (running) {
        throw new Error('Should not run in parallel')
      }

      running = true
      return new Promise((resolve) => {
        setTimeout(() => {
          running = false
          resolve()
        }, 10)
      })
    }
  }
}
