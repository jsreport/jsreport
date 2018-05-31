const fs = require('fs')

const config = JSON.parse(fs.readFileSync('jsreport.config.json').toString())
delete config.extensions['sample-template']
delete config.extensions['authentication']
fs.writeFileSync('jsreport.config.json', JSON.stringify(config))
