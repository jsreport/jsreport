# @jsreport/jsreport-authorization
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-authorization.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-authorization)

**Manage and delegate user permissions on jsreport objects. **

See https://jsreport.net/learn/authorization

## Changelog

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel
- add support for multi admin users

### 3.3.0

- refactor to use new methods collection.findAdmin, collection.findOneAdmin, reporter.adminRequest

### 3.2.2

- fix log about user's name

### 3.2.1

- changes to enable new `trustUserCode` option
- don't authorize modifying calls without users

### 3.0.2

- refactor ListenerCollection usage for better stack traces

### 3.0.0-beta.1

Adaptations for the v3 APIs
