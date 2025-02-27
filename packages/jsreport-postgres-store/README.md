# @jsreport/jsreport-postgres-store
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-postgres-store.svg?style=flat-square)](https://npmjs.com/package//@jsreport/jsreport-postgres-store)

**[jsreport](https://github.com/jsreport/jsreport) template store extension allowing to persist data in [PostgreSQL](http://www.postgresql.org/) database**

## Installation

> npm install @jsreport/jsreport-postgres-store

Then alter jsreport configuration
```js
{
	"store": {
		"provider": "postgres"
	},
	"extensions": {
		"postgres-store": {
			"host": "localhost",
			"port": 5433,
			"database": "jsreport",
			"user": "postgres",
			"password": "password",
			// optionaly enable ssl
			"ssl": true,
			// optionally customize ssl
			// https://node-postgres.com/features/ssl
			"ssl": { ... }
		}
	}
}
```

After jsreport initializes you should see tables like `jsreport.TemplateType` and other in `jsreport` database.

## Schema changes
If you do changes to the database schema by enabling additional extensions you need to drop the affected tables and let jsreport to reinitialize them.

## Changelog

### 4.1.0

- add schema to the postgres blob table
- create store indexes during schema creation

### 4.0.0

- minimum node.js version is now `18.15.0`

### 3.1.1

- add support for odata ne operator

### 3.1.0

- Support for complex $filter in count quert. Fix for 3.7.1 profiler

### 3.0.0-beta.1

- Adaptations for the v3 APIs
