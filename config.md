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
    "port": 3000,
	"blobStorage": "fileSystem",
	"useCluster": false
}
```


**configSession** `object` - informations used in express http session, this configuration is present because of future user authentication support

**certificate** `object` - path and keys to ssl certificates

**connectionString** `object` - jsreport by default uses simple [nedb](https://github.com/louischatriot/nedb) to store data. This embeded db is enought for most of the cases. Only if you have high traffic and many templates you should consider connecting jsreport to mongo db. To start using mongodb use following connection string format:
 `{ "name": "mongoDB", "address": "localhost", "port": 27017, "databaseName" : "jsreport" }`

 **extensions** `string array` - All specified extensions must be present somewhere in the jsreport directory. Order is not relevant because extensions are reordered by it's dependencies.

 **port** `(number)` - https port on which is jsreport running

**iisnode** `(true/false)`: jsreport can be hosted on windows in [iisnode](https://github.com/tjanczuk/iisnode),

**ga** `object`: google analytics settings, example
`"ga": { "name" : "jsreport.net", "id" : "UA-xxxxx-2" }`

**useCluster** `(true/false)` - default to `false`, by default when jsreport crashed it crashes. It's up to container to restart it. `useCluster` option allows to start jsreport in [cluster](http://nodejs.org/api/cluster.html) container that will take care of keeping jsreport alive.

**daemon** (`true/false`) - default `false`, non windows only, jsreport will run as [daemon](https://www.npmjs.org/package/daemon) and will not block command line

**httpPort** (number) - http port where will jsreport listen and automatically redirect to https port specified by `port` config

