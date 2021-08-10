# @jsreport/jsreport-docxtemplater
[![NPM Version](http://img.shields.io/npm/v/jsreport-docxtemplater.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-docxtemplater)
jsreport recipe for creating docx word document using [docxtemplater](https://docxtemplater.readthedocs.io/en/latest/)

See https://jsreport.net/learn/docxtemplater

## Installation

> **npm install @jsreport/jsreport-docxtemplater**


## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-core)

```js
const jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-docxtemplater')())

const result = await reporter.render({
  template: {
      engine: 'none',
      recipe: 'docxtemplater',
      docxtemplater: {
        templateAsset: {
          content: fs.readFileSync(path.join(__dirname, 'template.docx'))
        }
      }
    },
    data: {
      name: 'John'
    }
  }
)
```
