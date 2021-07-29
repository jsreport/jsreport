module.exports = () => {
  return {
    init: () => {
    },

    execute: (data) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const e = new Error('my error')
          e.someProp = 'foo'
          throw e
        })
      })
    }
  }
}
