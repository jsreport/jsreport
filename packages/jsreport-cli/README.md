# @jsreport/jsreport-cli
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-cli.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-cli)

**Command line interface for jsreport**

See http://jsreport.net/learn/cli for documentation

## Changelog

### 4.1.2

- update deps to fix audit

### 4.1.1

- update deps to fix audit
- print nested errors from error.cause

### 4.1.0

- update deps to fix audit
- add graceful shutdown to the server.js

### 4.0.5

- update dev prompt to prompts to fix audit

### 4.0.4

- dont use console.error(e.stack) and just console.error(e) to avoid loosing e.cause inner error

### 4.0.3

- update nodejs-client to fix audit

### 4.0.2

- update nodejs-client to fix npm audit

### 4.0.1

- fix cli .launch does not exists
- fix `jsreport.config.json` requires metadata for v4

### 4.0.0

- minimum node.js version is now `18.15.0`
- update deps to fix npm audit

### 3.2.3

- improve error logging

### 3.2.2

- add support for tempDirectory and service name to win-install command

### 3.2.0

- change the configure command questions to fit better with new `trustUserCode` option
- changes to enable new `trustUserCode` option

### 3.1.2

- update deps to fix npm audit

### 3.1.1

- update deps to fix npm audit

### 3.1.0

internal refactor (use latest version of yargs)

### 3.0.0-beta.1

Adaptations for the v3 APIs
