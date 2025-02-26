# @jsreport/jsreport-scripts
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-scripts.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-scripts)

**jsreport extension capable of running custom javascript functions during the rendering process**

See https://jsreport.net/learn/scripts

## Changelog

### 4.2.0

- modify script entity type to support creating store indexes

### 4.1.0

- internal changes to support new `response.output` api

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.4.1

- fix issue with `beforeRender`/`afterRender` scripts not being able to merge/replace existing buffers

### 3.4.0

- add support for specifying what are the main document properties of scripts entitySet

### 3.3.0

- ignore scripts attached to template which contain scope that is not compatible to run at the template level

### 3.2.1

- fix cannot propagate req.data object changes from sandbox when trustUserCode is true

### 3.0.1

- use relative path to the currently evaluated entity (use script path as the current entity path)
- fix performance issue in sandbox when using long buffers (don't use restore() of sandbox through a method attached to the sandbox)
- refactor ListenerCollection usage for better stack traces

### 3.0.0-beta.1

Adaptations for the v3 APIs
