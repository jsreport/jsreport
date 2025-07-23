# @jsreport/jsreport-reports
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-reports.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-reports)

**jsreport extension adding support for storing rendering outputs for later use**

See https://jsreport.net/learn/reports

## Changelog

### 4.1.5

- fix logging

### 4.1.4

- fix async reports handling when user group is logged in

### 4.1.3

- propagate res.meta.headers to the Location responses

### 4.1.2

- trigger async report using header to avoid allocating worker

### 4.1.1

- fix url in the async response text

### 4.1.0

- internal changes to support new `response.output` api

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.1.1

- reports cleanup should still clean all old reports found in the current interval, but it does in batches configured by `extensions.reports.cleanParallelLimit`
- prevent reports cleanup to run if it is already running

### 3.1.0

- reports cleanup now use a limit of report to clean on each interval (default 10, can be configured with `extensions.reports.cleanParallelLimit` option)

### 3.0.7

- remove meaningless log

### 3.0.6

- fix bug when there was render error

### 3.0.5

- fix return of proper filename for the report

### 3.0.4

- fix async rendering execution

### 3.0.3

- fix for passing data to async reports

### 3.0.2

fix some issue with sample data and input data in async reports

### 3.0.0-beta.1

Adaptations for the v3 APIs
