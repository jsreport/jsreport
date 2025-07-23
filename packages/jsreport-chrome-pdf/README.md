# @jsreport/jsreport-chrome-pdf
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-chrome-pdf.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-chrome-pdf)

**jsreport recipe which is rendering pdf and images from html using headless chrome**

See the docs

- https://jsreport.net/learn/chrome-pdf
- https://jsreport.net/learn/chrome-image

## Usage
To use `recipe` in for template rendering set `template.recipe=chrome-pdf` or `template.recipe=chrome-image` according to your needs in the rendering request.

chrome-pdf

```js
{
  template: { content: '...', recipe: 'chrome-pdf', engine: '...', chrome: { ... } }
}
```

chrome-image

```js
{
  template: { content: '...', recipe: 'chrome-image', engine: '...', chromeImage: { ... } }
}
```

## Changelog

### 4.3.0

- allow to use default docker image without extra flags

### 4.2.0

- implement chrome connect strategy
- add resources timeout for chrome

### 4.1.1

- set chrome protocolTimeout based on reportTimeout

### 4.1.0

- save generated pdf chrome as file streams to avoid keeping whole pdf in memory
- internal changes to support new `response.output` api

### 4.0.0

- update puppeteer to work with chrome 116
- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.4.0

- empty values `''` for pdf width, height and other options throw errors on recent versions of puppeteer, we now normalize options and don't pass empty values
- set explicit `launchOptions.headless: old` to avoid warnings, for now we use the old headless mode until the new mode gets stable

### 3.3.0

- use `Studio.openTab` with `docProp` option to open chrome header/footer tabs

### 3.2.1

- user level logs now use `logger.debug`
- threat timeout errors as weak errors
- use url.pathToFileURL to avoid problems with space in file paths for windows

### 3.2.0

- mark user logs appropriately to the logger

### 3.1.1

- changes to enable new `trustUserCode` option

### 3.1.1

- fix not applying the root chrome config

### 3.0.0-beta.1

Adaptations for the v3 APIs
