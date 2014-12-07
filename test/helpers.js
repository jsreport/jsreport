/*globals describe, it, beforeEach, afterEach */

var Reporter = require("../lib/reporter.js"),
    _ = require("underscore"),
    express = require("express"),
    path = require("path"),
    serveStatic = require('serve-static'),
    bodyParser = require("body-parser"),
    multer  = require('multer'),
    extend = require("node.extend");

var connectionString = exports.connectionString = process.env.DB === "neDB" ? {name: "neDB"}
    : { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 };

exports.describeReporting = function (rootDirectory, extensions, customOptions, nestedSuite ) {
    if (!nestedSuite) {
        nestedSuite = customOptions;
        customOptions = null;
    }

    describe("reporting", function () {
        var app = express();
        app.use(bodyParser.json({
            limit: 2 * 1024 * 1024 * 1//2MB
        }));

        app.use(serveStatic(path.join(__dirname, 'views')));
        app.engine('html', require('ejs').renderFile);

        var options = {
            tenant: { name: "test" },
            connectionString: connectionString,
            extensions: extensions,
            dataDirectory: "data",
            blobStorage: process.env.DB === "neDB" ? "fileSystem" : "gridFS",
            loadExtensionsFromPersistedSettings: false,
            cacheAvailableExtensions: true,
            express: { app: app },
            rootDirectory: rootDirectory
        };

        options = extend(true, options, customOptions || {});

        var reporter = new Reporter(options);


        beforeEach(function (done) {
            this.timeout(10000);

            reporter.buildContext().then(function () {
                return reporter.dataProvider.dropStore().then(function () {
                    return reporter.dataProvider.startContext().then(function (context) {
                        reporter.context = context;
                        return reporter.init().then(function() {
                            done();
                        });

                    });
                });
            }).catch(done);
        });

        afterEach(function () {
        });

        nestedSuite(reporter);
    });
};