#Configuration documentatoin

jsreport loads `dev.config.json` or `prod.config.json` on startup depending on your nodejs environment.  Configuration can be also specified directly in code, see [adapting jsreport](http://jsreport.net/learn/adapting-jsreport) for details. This article lists all the possible options for jsreport which can be used in config file ordirectly in code.

```javascript
{
    "certificate": {
        "key": "certificates/jsreport.net.key",
        "cert": "certificates/jsreport.net.cert"
    },
    "connectionString": { "name": "neDB" },
    "extensions": ["excel-parser", "express", "templates", "html", "phantom-pdf", "scripts", "data", "images", "statistics", "reports", "childTemplates", "sample-template"],
    "httpPort": 3000,
	"blobStorage": "fileSystem",
	"cluster": {
        "numberOfWorkers": 2,
        "enabled":  true
    },
	"phantom": {
        "numberOfWorkers" : 2,
        "timeout": 180000
    },
    "tasks": {
        "numberOfWorkers" : 2,
        "timeout": 10000
    },
	"logger": { "providerName": "winston" }
}
```

**certificate** `object` - path to key and cert file used by https

**connectionString** `object` - jsreport by default uses simple [nedb](https://github.com/louischatriot/nedb) to store data. This embeded db is enought for most of the cases. Only if you have high traffic and many templates you should consider connecting jsreport to mongo db. To start using mongodb use following connection string format:
 `{ "name": "mongoDB", "address": "localhost", "port": 27017, "databaseName" : "jsreport" }`. Third option is to use `inMemory` provider what is default when integrating jsreport into existing node.js application. 

 **extensions** `string array` - this attribute is `optional`. jsreport will load all
all extensions located under root directory if it's undefined or null. If the attribute is defined, jsreport will only load specified extensions. All specified extensions must be present somewhere in the jsreport directory. Order is not relevant because extensions are reordered by it's dependencies.

**httpPort** `(number)` - http port on which is jsreport running, if both `httpPort` and `httpsPort` are specified, jsreport will automaticaly create http redirects
from http to https, if any of `httpPort` and `httpsPort` is specified default process.env.PORT will be used
**httpsPort** (number) - https port on which jsreport is running

**ga** `object`: google analytics settings, example
`"ga": { "name" : "jsreport.net", "id" : "UA-xxxxx-2" }`

**cluster** `(object)` - defines if jsreport should be forked into cluster to increase throughtput of incoming requests. `cluster.numberOfWorkers` defines number of forked jsreport instances. jsreport will use number of cpus as default. Using `cluster.enabled` you can disable jsreport clustering and use just one single instance. Removing whole `cluster` node will have same effect.

Cluster will not work with `nedb` as data store. You need to set up a mongodb instance to be able cluster jsreport instances at the top level. But don't worry this is required only for really highest level of throughput. In the most cases it's enough just to increases number of workers executing phantomjs and javascript templating engines. See later `phantom` and `tasks` configuration.

**daemon** (`true/false`) - default `false`, non windows only, jsreport will run as [daemon](https://www.npmjs.org/package/daemon) and will not block command line

**phantom** (`object`) - this attribute is `optional` and is used to configure phantom-pdf recipe. 
**phantom.numberOfWorkers** (`int`) - specify how many phantomjs instances will phantom-pdf recipe use. If the value is not filled, jsreport will use number of cpus by default
**phantom.timeout** (`int`) - specify default timeout for pdf rendering using phantomjs
**phantom.allowLocalFilesAccess** (`bool`) - default is `false`. When set to true you can use local paths to get resources.

**tasks** (`object`) - this attribute is `optional` and is used to configure component executing custom scripts. This component is use to excute javascript templating engines during rendering or in scripts extension. You can set here `numberOfWorkers` attribute to specify how many child nodejs instances will be used for task execution. If the value is not filled, jsreport will use number of cpus by default. You can also set `timeout` attribute to specify default timeout for one task execution.

**rootDirectory** (`string`)  - optionally specifies where the application stores data, logs and temp files

**dataDirectory** (`string`) - optionally specifies absolute path to directory where the application stores images, reports and database files when using `neDB`

**tempDirectory** (`string`) - optionally specifies absolute path to directory where the application stores temporary files. Currently `phantom-pdf` recipe stores there every report.

**logger** (`object`) - optional, object should contain `providerName` property with values `console`, `dummy` or `winston` to specify particular logger. It can also optionally contain `logDirectory` specifying directory where should `winston` store logs. Default is `winston`.

**blobStorage** (`string`) - optional, specifies type of storage used for storing reports. It can be `fileSystem`, `inMemory` or `gridFS`. Defaults to `fileSystem` in full jsreport or to `inMemory` when integrating jsreport into existing node.js application. 

**express.inputRequestLimit** (`string`) - optional limit for incoming request size, default is `2mb`