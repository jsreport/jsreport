# @jsreport/studio-dev

[![NPM Version](http://img.shields.io/npm/v/@jsreport/studio-dev.svg?style=flat-square)](https://npmjs.com/package/@jsreport/studio-dev)

**Utils for developing jsreport studio extensions**

## jsreport-studio-start
`jsreport-studio-start` starts the jsreport studio in the development mode with hot reloading used for developing custom extensions.

## jsreport-studio-build

`jsreport-studio-build` command should be run from the main extension directory. It automatically locates `studio/main_dev.js` and build it. The most common approach is to run it from the `package.json`  `prepublish` script. It's also recommended to additionally install and use [in-publish](https://github.com/iarna/in-publish) module to assure the `jsreport-studio-build` does run only during npm publish.

```js
"scripts": {
    "prepublish": "in-publish && jsreport-studio-build || not-in-publish"
}
```

## Changelog

### 3.2.0

- add option `removeSourceMapUrl` to build command which allows to remove source map url references to packages

### 3.1.0

- remove socket.io (it is now part of fs-store)
- update deps to fix npm audit

### 3.0.1

fix jsreport-studio-start installing jsreport@beta instead of latest

### 3.0.0-beta.2

Fix jsreport-studio-start


### 3.0.0-beta.1

Adaptations for the v3 APIs



