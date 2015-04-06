/*globals describe, it, beforeEach, afterEach */

var Reporter = require("../lib/reporter.js"),
    _ = require("underscore"),
    express = require("express"),
    path = require("path"),
    serveStatic = require('serve-static'),
    bodyParser = require("body-parser"),
    util = require("../lib/util/util.js"),
    extend = require("node.extend");

var connectionString = exports.connectionString = process.env.DB === "neDB" ? {name: "neDB"}
    : {name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017};

exports.describeReporting = function (rootDirectory, extensions, customOptions, nestedSuite) {
    if (!nestedSuite) {
        nestedSuite = customOptions;
        customOptions = null;
    }

    describe("reporting", function () {
        var app = express();

        var options = {
            tenant: {name: "test"},
            connectionString: connectionString,
            extensions: extensions,
            dataDirectory: "data",
            blobStorage: process.env.DB === "neDB" ? "fileSystem" : "gridFS",
            loadExtensionsFromPersistedSettings: false,
            cacheAvailableExtensions: true,
            express: {app: app},
            rootDirectory: rootDirectory
        };

        options = extend(true, options, customOptions || {});

        var reporter = new Reporter(options);
        app.use(function(req, res, next) {
            var d = require('domain').create();
            d.add(req);
            d.add(res);
            d.req = req;
            d.res = res;

            d.run(function () {
                next();
            });
        });
        app.use(bodyParser.json({
            limit: 2 * 1024 * 1024 * 1//2MB
        }));
        app.use(serveStatic(path.join(__dirname, 'views')));
        app.engine('html', require('ejs').renderFile);

        beforeEach(function (done) {
            this.timeout(10000);

            return reporter.documentStore.drop().then(function () {
                return reporter.init();
            }).then(function () {
                done();
            }).catch(done);
        });

        afterEach(function () {
        });

        nestedSuite(reporter);
    });
};