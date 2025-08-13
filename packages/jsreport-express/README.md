# @jsreport/jsreport-express
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-express.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-express)

**jsreport extension adding http API**

See the documentation for API https://jsreport.net/learn/api and the node.js developers can visit also integration guide https://jsreport.net/learn/adapting-jsreport

## Changelog

### 4.2.3

- dont visit common error handler when response streaming fails, end immediately

### 4.2.2

- update simple-odata-server to fix nodejs deprecation warning

### 4.2.1

- update multer to fix audit

### 4.2.0

- update express to fix audit
- propagate res.meta.headers to the Location responses
- implement canceling requests from profiler

### 4.1.3

- update deps to fix npm audit

### 4.1.2

- trigger async report using header to avoid allocating worker

### 4.1.1

- update express to fix audit

### 4.1.0

- internal changes to support new `response.output` api

### 4.0.1

- fix memory being held when timeouts are large

### 4.0.0

- minimum node.js version is now `18.15.0`
- avoid http basic authentication error dialog when authorization errors happen from studio actions
- internal changes to support multi admin users

### 3.7.1

- postpone setting http response timeout until the `req.options.timeout` is parsed

### 3.7.0

- add support for odata `ne` operator

### 3.6.0

- update deps to fix npm audit

### 3.5.0

- wait for jsreport initialization globally in middleware (this means that http routes will wait until jsreport is initialized before going to the route logic)

### 3.4.2

- update multer to fix npm audit

### 3.4.1

- filter out nested properties with visible false from odata outputs
- fix extensions not being able to modify meta.headers in afterRender

### 3.4.0

- add option `extensions.express.cors.enabled` to enable/disable cors handling in jsreport
- fix applying req.options.timeout when enableRequestReportTimeout is true

### 3.3.1

update multer to fix npm audit warning

### 3.3.0

use req.socket to listen on canceled request because req.connection was deprecated

### 3.1.0

- add `/api/schema/:entitySet` route to fetch json schema for entitySet
- don't crash when host header missing

### 3.0.1

fix for passing express app into options

### 3.0.0

Adaptations for the v3 APIs
