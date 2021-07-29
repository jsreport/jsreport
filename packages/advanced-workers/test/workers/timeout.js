module.exports = (initData) => {
  return {
    init: () => {
      return initData
    },

    execute: (data) => {
      if (data.endless === false) {
        return
      }
      while (true) {
        // endles loop
      }
    }
  }
}
