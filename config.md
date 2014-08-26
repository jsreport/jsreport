#Configuration documentatoin

jsreport loads `dev.config.json` or `prod.config.json` on startup depending on your nodejs environment. If the config file is not found, jsreport creats default one.

`jsreport configuration file`
```javascript
{
    "cookieSession": {
        "secret": "dasd321as56d1sd5s61vdv32",
        "cookie": { "domain": "local.net" }
    },
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
    }
}
```


**configSession** `object` - informations used in express http session, this configuration is present because of future user authentication support

**certificate** `object` - path to key and cert file used by https 

**connectionString** `object` - jsreport by default uses simple [nedb](https://github.com/louischatriot/nedb) to store data. This embeded db is enought for most of the cases. Only if you have high traffic and many templates you should consider connecting jsreport to mongo db. To start using mongodb use following connection string format:
 `{ "name": "mongoDB", "address": "localhost", "port": 27017, "databaseName" : "jsreport" }`

 **extensions** `string array` - this attribute is `optional`. jsreport will load all
all extensions located under root directory if it's not present. If the attribute is defined, jsreport will only load specified extensions. All specified extensions must be present somewhere in the jsreport directory. Order is not relevant because extensions are reordered by it's dependencies.

**httpPort** `(number)` - http port on which is jsreport running, if both `httpPort` and `httpsPort` are specified, jsreport will automaticaly create http redirects
from http to https, if any of `httpPort` and `httpsPort` is specified default process.env.PORT will be used
**httpsPort** (number) - https port on which jsreport is running

**ga** `object`: google analytics settings, example
`"ga": { "name" : "jsreport.net", "id" : "UA-xxxxx-2" }`

**cluster** `(object)` - defines if jsreport should be forked into cluster to increase throughtput of incoming requests. `cluster.numberOfWorkers` defines number of forked jsreport instances. jsreport will use number of cpus as default. Using `cluster.enabled` you can disable jsreport clustering and use just one single instance. Removing whole `cluster` node will have same effect.

Cluster will not work with `nedb` as data store. You need to set up a mongodb instance to be able cluster jsreport instances at the top level. But don't worry this is required only for really highest level of throughput. In the most cases it's enough just to increases number of workers executing phantomjs and javascript templating engines. See later `phantom` and `tasks` configuration.

**daemon** (`true/false`) - default `false`, non windows only, jsreport will run as [daemon](https://www.npmjs.org/package/daemon) and will not block command line

**phantom** (`object`) - this attribute is `optional` and is used to configure phantom-pdf recipe. You can set here `numberOfWorkers` attribute to specify how many phantomjs instances will phantom-pdf recipe use. If the value is not filled, jsreport will use number of cpus by default. You can also set `timeout` attribute to specify default timeout for pdf rendering using phantomjs.

**tasks** (`object`) - this attribute is `optional` and is used to configure component executing custom scripts. This component is use to excute javascript templating engines during rendering or in scripts extension. You can set here `numberOfWorkers` attribute to specify how many child nodejs instances will be used for task execution. If the value is not filled, jsreport will use number of cpus by default. You can also set `timeout` attribute to specify default timeout for one task execution.