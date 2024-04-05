# @jsreport/jsreport-docker-workers
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-docker-workers.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-docker-workers)

**jsreport extension managing docker containers and delegating work to them**

See https://jsreport.net/learn/docker-workers

## Changelog

### 4.0.1

- fix temp autocleanup

### 4.0.0

- support response streaming introduced in jsreport 4.3.0

### 3.8.0

- optimization using axios stream type instead of text
- fix request aborting causing main container restarts
