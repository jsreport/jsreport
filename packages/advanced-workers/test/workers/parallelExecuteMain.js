module.exports = (initData, { executeMain }) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      const res = []
      for (let i = 0; i < 10; i++) {
        res.push(executeMain(i))
      }
      return Promise.all(res)
    }
  }
}
