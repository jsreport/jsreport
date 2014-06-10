/*globals describe, it, beforeEach, afterEach */

var Reporter = require("../lib/reporter.js"),
    _ = require("underscore"),
    async = require("async"),
    express = require("express"),
    connect = require("connect"),
    path = require("path"),
    MongoClient = require('mongodb').MongoClient,
    serveStatic = require('serve-static');

exports.describeReporting = function(rootDirectory, extensions, nestedSuite) {
    describe("reporting", function() {
        var app = express();
        app.use(require("body-parser")());
        app.use(require("method-override")());
        app.use(require("connect-multiparty")());
        app.use(serveStatic(path.join(__dirname, 'views')));
        app.engine('html', require('ejs').renderFile);

        var reporter = new Reporter({
            tenant: { name: "test" },
            connectionString: { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 },
            extensions: _.union(["templates", "html", "phantom-pdf", "fop-pdf", "data", "reports", "statistics", "express"], extensions),
            loadExtensionsFromPersistedSettings: false,
            cacheAvailableExtensions: true,
            express: { app: app },
            rootDirectory: rootDirectory
        });

        beforeEach(function(done) {
            this.timeout(10000);

            MongoClient.connect('mongodb://127.0.0.1:27017/test', {}, function (err, db) {
                db.dropDatabase(function () {
                    reporter.init().then(function () {
                        reporter.dataProvider.startContext().then(function(context) {
                            reporter.context = context;
                            done();
                        });
                    });
                });
            });
        });

        afterEach(function() {

        });

        nestedSuite(reporter);
    });
};