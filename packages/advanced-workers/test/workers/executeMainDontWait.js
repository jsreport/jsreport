module.exports = (initData, { executeMain }) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      executeMain(data)
    }
  }
}
