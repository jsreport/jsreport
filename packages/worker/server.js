const Worker = require('./')

Worker().init().then(() => {
  console.log('running')
})
