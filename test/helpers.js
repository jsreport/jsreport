/*globals describe, it, beforeEach, afterEach */

var Reporter = require("../lib/reporter.js"),
    _ = require("underscore"),
    express = require("express"),
    path = require("path"),
    serveStatic = require('serve-static');

var connectionString = exports.connectionString = process.env.DB === "neDB" ? {name: "neDB"}
    : { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 };

exports.describeReporting = function (rootDirectory, extensions, nestedSuite) {
    describe("reporting", function () {
        var app = express();
        app.use(require("body-parser")());
        app.use(require("method-override")());
        app.use(require("connect-multiparty")());
        app.use(serveStatic(path.join(__dirname, 'views')));
        app.engine('html', require('ejs').renderFile);


        var reporter = new Reporter({
            tenant: { name: "test" },
            connectionString: connectionString,
            extensions: extensions,
            blobStorage: process.env.DB === "neDB" ? "fileSystem" : "gridFS",
            loadExtensionsFromPersistedSettings: false,
            cacheAvailableExtensions: true,
            express: { app: app },
            rootDirectory: rootDirectory
        });


        beforeEach(function (done) {
            this.timeout(10000);

            reporter.init().then(function () {
                reporter.dataProvider.dropStore().then(function () {
                    reporter.dataProvider.startContext().then(function (context) {
                        reporter.context = context;
                        done();
                    });
                });
            });
        });

        afterEach(function () {

        });

        nestedSuite(reporter);
    });
};