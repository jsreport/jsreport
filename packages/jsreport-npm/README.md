# @jsreport/jsreport-npm
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-data.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-npm)

**Install and require custom npm modules from scripts and templating engines runtime**

See https://jsreport.net/learn/npm

## Changelog

### 4.0.1

- use fs based lockfile to avoid parallel npm install

### 4.0.0

- minimum node.js version is now `18.15.0`
- fix text in validation error

### 3.2.0

- allow `jsreport.npm.require` to require sub paths `await jsreport.npm.require('yargs@17.7.2/package.json')`
- allow `jsreport.npm.require` to require `@` scoped packages

### 3.1.2

- changes to enable new `trustUserCode` option
- changes to enable caching of system helpers

### 3.1.1

add package.json to path when checking module existence

### 3.0.0-beta.1

Initial release
