# @jsreport/jsreport-mssql-store
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-mssql-store.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-mssql-store)

**[jsreport](https://github.com/jsreport/jsreport) template store extension allowing to persist data in [Microsoft SQL Server](https://www.microsoft.com/en/server-cloud/products/sql-server/)**


## Installation

> npm install @jsreport/jsreport-mssql-store

Then alter jsreport configuration
```js
{
	"store": {
		"provider": "mssql"
	},
	"extensions": {
		"mssql-store": {
			"user": "jsreport",
			"password": "password",
			"server": "janblaha-PC\\SQLEXPRESS",
			"database": "jsreport",
			"schema": "mycustomschema",			
			"options": {
				/* required for sql azure */
				"encrypt": true,
				/* required for local dev instances */
				"trustServerCertificate": true
			}
		}
	}
}
```

Alternatively you can pass the connection string as uri
```js
"store": {
	"provider": "mssql"
},
"extensions": {
	"mssql-store": {
		"uri": "Server=tcp:jsreport.database.windows.net,1433;Initial Catalog=jsreport;Persist Security Info=False;User ID=myuser;Password=password;MultipleActiveResultSets=False;Encrypt=True;"
	}
}
```

**Make sure your TCP/IP protocol is enabled in the SQL Server Configuration Manager and the SQL Browser service is running.**

After jsreport initializes you should see tables like `jsreport.TemplateType` and others in `jsreport` database.

## Schema changes
If you do changes to the database schema by enabling additional extensions you need to drop the affected tables and let jsreport to reinitialize them.

## Changelog

### 3.1.0

Support for complex $filter in count quert. Fix for 3.7.1 profiler

### 3.0.0-beta.1

Adaptations for the v3 APIs
