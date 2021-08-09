# jsreport-postgres-store
[![NPM Version](http://img.shields.io/npm/v/jsreport-postgres-store.svg?style=flat-square)](https://npmjs.com/package/jsreport-postgres-store)
[![Build Status](https://travis-ci.org/jsreport/jsreport-postgres-store.png?branch=master)](https://travis-ci.org/jsreport/jsreport-postgres-store)

**[jsreport](https://github.com/jsreport/jsreport) template store extension allowing to persist data in [PostgreSQL](http://www.postgresql.org/) database**


## Installation

> npm install jsreport-postgres-store

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
			"password": "password"
		}
	}
}
```

After jsreport initializes you should see tables like `jsreport.TemplateType` and other in `jsreport` database.

## Schema changes
If you do changes to the database schema by enabling additional extensions you need to drop the affected tables and let jsreport to reinitialize them.


## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)


```js
var jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-postgres-store')({ host: '...'}))
```
