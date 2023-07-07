import Promise from 'bluebird'

export default function () {
  /* eslint-disable-next-line */
  if (__DEVELOPMENT__) {
    require('../extensions_dev.js')
    require('../extensions_dev.css')
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    require.ensure([], function (require) {
      require('../extensions.js')
      resolve()
    }, 'studio-extensions')
  })
}
