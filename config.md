#Configuration documentation

The easiest way to adapt jsreport to your needs is to change its configuration. jsreport configuration provides many options like changing http port, setting connection string to mongo and many others.

jsreport merges configuration from file, environment variables, command line arguments and also directly from the application code. The configuration file needs to be stored at the root of the application with the name `prod.config.json`. There should be already pre created for you the default one.

> **Performance note**
> Since version 0.8 jsreport uses by default dedicated processes for rendering pdf or scripts.  This solution works better in some cloud and corporate environments with proxies. However for other cases it is better to reuse phantomjs and nodejs workers over multiple requests. Please see `phantom.strategy` and `tasks.strategy` for details.

##Web

**httpPort** `(number)` - http port on which is jsreport running, if both `httpPort` and `httpsPort` are specified, jsreport will automaticaly create http redirects
from http to https, if any of `httpPort` and `httpsPort` is specified default process.env.PORT will be used

**httpsPort** (number) - https port on which jsreport is running

**certificate** `object` - path to key and cert file used by https

##Basics

**connectionString** `object` - jsreport by default uses simple [nedb](https://github.com/louischatriot/nedb) to store data. This embeded db is enought for most of the cases. Only if you have high traffic and many templates you should consider connecting jsreport to mongo db. To start using mongodb use following connection string format:
 `{ "name": "mongoDB", "address": "localhost", "port": 27017, "databaseName" : "jsreport" }`. Third option is to use `inMemory` provider what is default when integrating jsreport into existing node.js application. 
 
 **extensions** `string array` - this attribute is `optional`. jsreport will load all
all extensions located under root directory if it's undefined or null. If the attribute is defined, jsreport will only load specified extensions. All specified extensions must be present somewhere in the jsreport directory. Order is not relevant because extensions are reordered by it's dependencies.

**rootDirectory** (`string`)  - optionally specifies where the application stores data, logs and temp files

**dataDirectory** (`string`) - optionally specifies absolute path to directory where the application stores images, reports and database files when using `neDB`

**tempDirectory** (`string`) - optionally specifies absolute path to directory where the application stores temporary files. Currently `phantom-pdf` recipe stores there every report.

**blobStorage** (`string`) - optional, specifies type of storage used for storing reports. It can be `fileSystem`, `inMemory` or `gridFS`. Defaults to `fileSystem` in full jsreport or to `inMemory` when integrating jsreport into existing node.js application. 

##Phantom

**phantom** (`object`) - this attribute is `optional` and is used to configure phantomjs which is used in various recipes

**phantom.strategy** (`dedicated-process | phantom-server`) - The first strategy uses a new phantomjs instance for every task.  The second strategy reuses every instance over multiple requests. Where `phantom-server` has better performance, the default `dedicated-process` is more suitable to some cloud and corporate environments with proxies

**phantom.numberOfWorkers** (`int`) - specify how many phantomjs instances will phantom-pdf recipe use. If the value is not filled, jsreport will use number of cpus by default

**phantom.timeout** (`int`) - specify default timeout for pdf rendering using phantomjs

**phantom.allowLocalFilesAccess** (`bool`) - default is `false`. When set to true you can use local paths to get resources.

**phantom.host** (`string`) - Set a custom hostname on which phantomjs server is started, useful is cloud environments where you need to set specific IP.

**phantom.portLeftBoundary** (`number`) - set a specific port range for phantomjs server

**phantom.portRightBoundary** (`number`) - set a specific port range for phantomjs server

##Script tasks

**tasks** (`object`) - this attribute is `optional` and is used to configure component executing custom scripts. This component is use to excute javascript templating engines during rendering or in scripts extension. 

**tasks.strategy** (`dedicated-process | http-server`) - The first strategy uses a new nodejs instance for every task.  The second strategy reuses every instance over multiple requests. Where `http-server` has better performance, the default `dedicated-process` is more suitable to some cloud and corporate environments with proxies.  

**tasks.numberOfWorkers** (`number`) - how many child nodejs instances will be used for task execution

**tasks.timeout** (`number`) -  specify default timeout in ms for one task execution 

**tasks.host** (`string`) - Set a custom hostname on which script execution server is started, useful is cloud environments where you need to set specific IP.

**tasks.portLeftBoundary** (`number`) - set a specific port range for script execution server

**tasks.portRightBoundary** (`number`) - set a specific port range for script execution server

##Advanced

**hostname** `(string)` - hostname to be used for the jsreport server (`optional`)

**ga** `object`: google analytics settings, example
`"ga": { "name" : "jsreport.net", "id" : "UA-xxxxx-2" }`

**cluster** `(object)` - defines if jsreport should be forked into cluster to increase throughtput of incoming requests. `cluster.numberOfWorkers` defines number of forked jsreport instances. jsreport will use number of cpus as default. Using `cluster.enabled` you can disable jsreport clustering and use just one single instance. Removing whole `cluster` node will have same effect.

**daemon** (`true/false`) - default `false`, non windows only, jsreport will run as [daemon](https://www.npmjs.org/package/daemon) and will not block command line

**express.inputRequestLimit** (`string`) - optional limit for incoming request size, default is `2mb`

**appPath** (`string`)  - optionally set application path, if you run application on http://appdomain.com/reporting then set `/reporting` to `appPath`

**logger** (`object`) - optional, object should contain `providerName` property with values `console`, `dummy` or `winston` to specify particular logger. It can also optionally contain `logDirectory` specifying directory where should `winston` store logs. Default is `winston`.

##Example of the config file


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