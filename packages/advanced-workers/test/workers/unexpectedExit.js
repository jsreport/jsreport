module.exports = (initData) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      process.exit()
    }
  }
}
