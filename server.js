var reporter = require('./')({rootDirectory: __dirname})

var reporter = require('jsreport')()
reporter.init().then(function () {
  reporter.authorization.findPermissionFilteringListeners.add('readonly everything', function (collection, query, req) {
    delete query.readPermissions
  })
}).catch(function (e) {
  console.trace(e)
  throw e
})




//
//
//var express = require('express');
//var app = express();
//
//app.get('/', function (req, res) {
// res.send('Hello from the main application');
//});
//
//var reportingApp = express();
//app.use('/reporting', reportingApp);
//
//var jsreport = require('./')({
// express: { app :reportingApp },
// rootDirectory: __dirname
//});
//
//jsreport.init().then(function() {
// app.listen(3000);
//});

