module.exports = (initData) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      const error = new Error('my error')
      error.someProp = 'foo'
      throw error
    }
  }
}
