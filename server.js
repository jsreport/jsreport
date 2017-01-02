require('./')({rootDirectory: __dirname}).init().catch(function (e) {
  console.trace(e)
  process.exit(1)
})
