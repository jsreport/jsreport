module.exports = (initData, { executeMain }) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      return executeMain(data)
    },

    close: async () => {

    }
  }
}
