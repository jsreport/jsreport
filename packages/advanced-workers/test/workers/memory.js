module.exports = (initData) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      if (data.OOM) {
        const buffers = []
        while (true) {
          buffers.push(Buffer.alloc(1000, 'a'))
        }
      } else {
        return 'ok'
      }
    }
  }
}
