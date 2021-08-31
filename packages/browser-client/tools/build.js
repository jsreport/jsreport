const fs = require('fs')
const path = require('path')

const jsreportminjs = fs.readFileSync(path.join(__dirname, 'jsreport.min.js'))
const filesaver = fs.readFileSync(path.join(__dirname, '../', 'thirdparty', 'FileSaver.js'))
const jsreportjs = fs.readFileSync(path.join(__dirname, '../', 'src', 'jsreport.js'))

fs.writeFileSync(path.join(__dirname, '../', 'jsreport.min.js'), filesaver + jsreportminjs)
fs.writeFileSync(path.join(__dirname, '../', 'jsreport.js'), filesaver + jsreportjs)
