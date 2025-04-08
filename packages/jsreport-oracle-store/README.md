# @jsreport/jsreport-oracle-store
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-oracle-store.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-oracle-store)

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

3. `npm install @jsreport/jsreport-oracle-store`

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

## Changelog

### 4.1.0

- create store indexes during schema creation

### 4.0.0

- minimum node.js version is now `18.15.0`

### 3.3.2

- moved oracledb to optionalDependencies to be able to build docker ARM image correctly
- revert to the old oracledb thick client

### 3.3.1

- moved oracledb to dependencies
- use new oracledb thin client

### 3.2.2

- fix oracle blob storage

### 3.2.1

- add support for odata ne operator

### 3.2.0

- move `oracledb` from `dependencies` to `optionalDependencies` to be able to run for docker ARM images

### 3.1.0

Support for complex $filter in count quert. Fix for 3.7.1 profiler

### 3.0.1

- add missing blobstorage to jsreport.config.js

### 3.0.0-beta.1

Adaptations for the v3 APIs
