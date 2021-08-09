# jsreport-unoconv
[![NPM Version](http://img.shields.io/npm/v/jsreport-unoconv.svg?style=flat-square)](https://npmjs.com/package/jsreport-unoconv)
jsreport extension using [unoconv](https://github.com/dagwieers/unoconv) to convert outputs to the formats supported by openoffice

See https://jsreport.net/learn/unoconv

## Installation

> **npm install jsreport-unoconv**


## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-docxtemplater')())
jsreport.use(require('@jsreport/jsreport-unoconv')({
  command: 'unoconv'
}))

const result = await reporter.render({
  template: {
      engine: 'none',
      recipe: 'docxtemplater',
      docxtemplater: {
        templateAsset: {
          content: fs.readFileSync(path.join(__dirname, 'template.docx'))
        }
      },
      unoconv: {
        format: 'pdf'
      }
    },
    data: {
      name: 'John'
    }
  }
)
```
