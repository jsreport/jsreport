# @jsreport/jsreport-assets

[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-assets.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-assets)

**jsreport extension embedding static assets like fonts or helpers into the templates**

See https://jsreport.net/learn/assets

## Changelog

### 3.4.0

- fix asset link click from xlsx template preview
- update to improve the display of templates with xlsx in studio

### 3.3.0

fix studio usage of old property `scope`, new one: `sharedHelpersScope`

### 3.0.1

- use relative path to the currently evaluated entity (for example relative asset inside script should be relative to the script)

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

