# @jsreport/jsreport-assets

[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-assets.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-assets)

**jsreport extension embedding static assets like fonts or helpers into the templates**

See https://jsreport.net/learn/assets

## Changelog

### 3.0.0-beta.1

Initial release for jsreport v3
New templating engine helpers introduced
```
{{#asset pathOrName}}
```
jsreport proxy extended with additional functions
```
const jsreport = require('jsreport-proxy')
jsreport.assets.read(path)
jsreport.assets.require(path)
jsreport.assets.registerHelpers(path)
```

