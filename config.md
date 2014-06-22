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
	"useCluster": false
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

**useCluster** `(true/false)` - default to `false`, by default when jsreport crashed it crashes. It's up to container to restart it. `useCluster` option allows to start jsreport in [cluster](http://nodejs.org/api/cluster.html) container that will take care of keeping jsreport alive.

**daemon** (`true/false`) - default `false`, non windows only, jsreport will run as [daemon](https://www.npmjs.org/package/daemon) and will not block command line

