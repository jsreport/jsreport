var fs = require('fs')
var path = require('path')

var jsreportminjs = fs.readFileSync(path.join(__dirname, 'jsreport.min.js'))
var filesaver = fs.readFileSync(path.join(__dirname, '../', 'thirdparty', 'FileSaver.js'))
var jsreportjs = fs.readFileSync(path.join(__dirname, '../', 'src', 'jsreport.js'))

fs.writeFileSync(path.join(__dirname, '../', 'jsreport.min.js'), filesaver + jsreportminjs)
fs.writeFileSync(path.join(__dirname, '../', 'jsreport.js'), filesaver + jsreportjs)
