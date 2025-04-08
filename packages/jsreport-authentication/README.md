# @jsreport/jsreport-authentication
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-authentication.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-authentication)

**Add login screen to jsreport and user management forms**

See https://jsreport.net/learn/authentication

## Changelog

### 4.2.3

- fix login of non admin user in sql based stores

### 4.2.2

- update deps to fix npm audit

### 4.2.1

- fix regression with user with "allow read all entities" not working
- update passport to 0.7.0 and fix npm audit

### 4.2.0

- expose safe properties of req.context.user in sandbox
- update ejs to fix deps audit

### 4.1.1

- update express, body-parser to fix npm audit

### 4.1.0

- internal changes to support new `response.output` api
- auth with authorization server logs more errors from http request to remote server

### 4.0.1

- fix `jsreport.config.json` requires metadata for v4

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel
- avoid http basic authentication error dialog when authorization errors happen from studio actions
- add support for multi admin users

### 3.4.0

- update deps to fix npm audit

### 3.3.2

- add option to disable users .username -> name migration

### 3.3.1

- update ejs to fix npm audit warning

### 3.3.0

- disable studio login page when studio extension is disabled

### 3.0.0-beta.1

Adaptations for the v3 APIs
