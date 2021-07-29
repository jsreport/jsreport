# jsreport-express
[![NPM Version](http://img.shields.io/npm/v/jsreport-express.svg?style=flat-square)](https://npmjs.com/package/jsreport-express)
[![Build Status](https://travis-ci.org/jsreport/jsreport-express.png?branch=master)](https://travis-ci.org/jsreport/jsreport-express)

> jsreport extension adding API and studio

`jsreport-express` is the main extension you need when you want to add jsreport studio or API. Many other extensions works in conjunction with `jsreport-express` and extends studio ui or API. Just to name some of them:

- [jsreport-data](https://github.com/jsreport/jsreport-data)
- [jsreport-scripts](https://github.com/jsreport/jsreport-scripts)
- [jsreport-statistics](https://github.com/jsreport/jsreport-statistics)
- [jsreport-authentication](https://github.com/jsreport/jsreport-authentication)

And many others. Where some of them are working also without `jsreport-express` and some of them doesn't.  This extension is designed to be just a wrapper for ui and it doesn't work standalone.

## jsreport-core
The following example shows how to start jsreport studio through express extension.
```js
var jsreport = require('jsreport-core')();
jsreport.use(require('jsreport-express')({ httpPort: 2000}));

jsreport.init();
```

### Attach to existing express app
`jsreport-express` by default creates a new express.js application and starts to listen on specified port. In some cases you may rather use your own express.js app and just let `jsreport-express` to add specific routes to it. This can be done in the following way:
```js
var express = require('express');

var app = express();

app.get('/', function (req, res) {
  res.send('Hello from the main application');
});

var reportingApp = express();
app.use('/reporting', reportingApp);

var jsreport = require('jsreport-core')();
jsreport.use(require('jsreport-express')({ app: reportingApp }));

jsreport.init();
app.listen(3000);
```

## jsreport
You can use the same technique in the full distribution of jsreport or with the auto discovered extensions:
```js
var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello from the main application');
});

var reportingApp = express();
app.use('/reporting', reportingApp);

var jsreport = require('jsreport')({
  extensions: {
    express: { app: reportingApp }
  }
});

jsreport.init();
app.listen(3000);
```

## Configuration

`jsreport-express` uses some options from the global configuration:

`httpPort` (number) - http port on which is jsreport running, if both httpPort and httpsPort are specified, jsreport will automaticaly create http redirects from http to https, if any of httpPort and httpsPort is specified default process.env.PORT will be used

`httpsPort` (number) - https port on which jsreport is running

`appPath` (string) - optionally set application path, if you run application on http://appdomain.com/reporting then set "/reporting" to `appPath`. The default behavior is that it is assumed that jsreport is running behind a proxy, so you need to do url url rewrite /reporting -> / to make it work correctly, See `mountOnAppPath` when there is no proxy + url rewrite involved in your setup.

`mountOnAppPath` (boolean) - use this option along with `appPath`. it specifies if all jsreport routes should be available with appPath as prefix, therefore making `appPath` the new root url of application

`certificate` object - path to key and cert file used by https
