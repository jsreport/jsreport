const client = require('@jsreport/nodejs-client')('http://localhost:5488')
const fs = require('fs')
const html = fs.readFileSync('main.html').toString()
client.render({
  /* template: {
    content: html,
    engine: 'none',
    recipe: 'chrome-pdf'
  } */
  template: {
    name: 'test-bulk-template'
  },
  data: JSON.parse(fs.readFileSync('data.json').toString())
}).then((r) => r.body())
  .then((b) => fs.writeFileSync('out.pdf', b))
  .catch(console.error)
