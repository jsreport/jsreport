# @jsreport/jsreport-scheduling
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-scheduling.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-scheduling)

**jsreport extension for scheduling background rendering jobs**

See https://jsreport.net/learn/scheduling

## Changelog

### 4.1.0

- update cron-parser dep to support nth weekday of month like 0 0 * * 1#1
- create store indexes during schema creation
- implement canceling requests from profiler

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel
- internal changes to support multi admin users

### 3.0.3

- update deps to fix npm audit

### 3.0.2

- update deps to fix npm audit

### 3.0.1

- refactor ListenerCollection usage for better stack traces

### 3.0.0-beta.1

Adaptations for the v3 APIs
