# jsreport-oracle-store

[![NPM Version](http://img.shields.io/npm/v/jsreport-oracle-store.svg?style=flat-square)](https://npmjs.com/package/jsreport-oracle-store)
[![Build Status](https://travis-ci.com/jsreport/jsreport-oracle-store.png?branch=master)](https://travis-ci.com/jsreport/jsreport-oracle-store)

**[jsreport](https://github.com/jsreport/jsreport) template store extension allowing to persist data in [Oracle database](https://www.oracle.com/database/)**


## Installation

**Only version 12 or higher is supported**

1. Install instant client basic: [oracle-instant-client](https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html)

2. set environment variables e.g. for 18.5
```
ORACLE_HOME=/usr/lib/oracle/18.5/client64
PATH=$ORACLE_HOME/bin:$PATH
LD_LIBRARY_PATH=$ORACLE_HOME/lib
```

3. `npm install jsreport-oracle-store`

4. Alter jsreport configuration
```js
{
	"store": {
		"provider": "oracle"
	},
	"extensions": {
		"oracle-store": {
			"user": "jsreport",
			"password": "password",
			"connectionString": "localhost:1521/XEPDB1",
			"poolMin": 0,
			"poolMax": 20,
			"poolIncrement": 1
		}
	}
}
```

After jsreport initializes you should see tables like `jsreport.TemplateType` and others in `jsreport` database.

## Schema changes
If you do changes to the database schema by enabling additional extensions you need to drop the affected tables and let jsreport to reinitialize them.

## jsreport-core
You can apply this extension also manually to [jsreport-core](https://github.com/jsreport/jsreport-core)

```js
var jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-oracle-store')({ server: '...'}))
```
