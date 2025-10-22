# @jsreport/jsreport-sample-template
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-sample-template.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-sample-template)

**jsreport extension which creates sample templates at the first run**

## Configuration

```js
"extensions": {
  "sample-template": {
    /* when true, it will create defined samples*/
    "createSamples": true,
    /*
      by default samples will be created only on the first run of your jsreport installation,
      when this option is true it will allow to create the samples in the next run
      (useful when you want to install a new version of this extension and want to create the new examples that come with it)
    */
    "forceCreation": false
  }
}
```

## Changelog

### 4.0.2

- update style in Orders sample needed to work after the Chromium 138 update

### 4.0.1

- fix demo chart

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.2.1

- update samples to mention new `trustUserCode` option

### 3.2.0

- update extensions deps

### 3.1.0

- update samples

### 3.0.0-beta.1

Adaptations for the v3 APIs
