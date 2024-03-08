module.exports = (initData) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      setTimeout(() => {
        throw new Error('async error')
      }, 0)
      return 'foo'
    }
  }
}
