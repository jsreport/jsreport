# @jsreport/jsreport-scripts
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-scripts.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-scripts)

**jsreport extension capable of running custom javascript functions during the rendering process**

See https://jsreport.net/learn/scripts

## Changelog

### 3.0.1

- use relative path to the currently evaluated entity (use script path as the current entity path)
- fix performance issue in sandbox when using long buffers (don't use restore() of sandbox through a method attached to the sandbox)
- refactor ListenerCollection usage for better stack traces

### 3.0.0-beta.1

Adaptations for the v3 APIs
