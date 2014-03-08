var Reporter = require("../reporter.js"),
    jaydata = require("odata-server"),
    _ = require("underscore"),
    async = require("async"),
    express = require("express"),
    connect = require("connect"),
    path = require("path"),
    MongoClient = require('mongodb').MongoClient;


exports.describeReportingPlayground = function(rootDirectory, extensions, nestedSuite) {
    exports.describeReporting(rootDirectory, extensions, true, nestedSuite);
};

exports.describeReporting = function (rootDirectory, extensions, isPlayground, nestedSuite) {
    if (_.isFunction(isPlayground)) {
        nestedSuite = isPlayground;
        isPlayground = false;
    }

    describe("reporting", function () {
        
        var app = express();
        app.use(connect.bodyParser());
        app.use(express.methodOverride());
        app.use(express.static(path.join(__dirname, 'views')));
        app.engine('html', require('ejs').renderFile);
        
        var reporter = new Reporter({
            playgroundMode: isPlayground,
            tenant: { name: "test"},
            connectionString: { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 },
            extensions: _.union(["templates", "html", "phantom-pdf", "fop-pdf", "data", "reports", "statistics", "express"], extensions),
            loadExtensionsFromPersistedSettings: false,
            cacheAvailableExtensions: true,
            express: { app: app},
            rootDirectory: rootDirectory
        });
       
        beforeEach(function (done) {
            this.timeout(10000);
            reporter.init().then(function () {
                     done();
            });
        });
        

        afterEach(function(done) {
            this.timeout(10000);

            MongoClient.connect('mongodb://127.0.0.1:27017/test', {}, function(err, db) {
                db.dropDatabase(function() {
                    done();
                });
            });


            //async.eachSeries(reporter.context.getType().memberDefinitions.asArray(), function (memDef, cb) {
            //            if (memDef.dataType == $data.EntitySet) {
            //                reporter.context[memDef.name].deleteEnabled = true;
            //                reporter.context[memDef.name].toArray().then(function (ents) {
            //                    _.each(ents, function (ent) { ent.remove(); });
            //                    cb();
            //                });
            //            } else {
            //                cb();
            //            }
            //        }, function () {
            //            reporter.context.saveChanges().then(function() {
            //                 done();
            //            });
            //        });
        });

        nestedSuite(reporter);
    });
};
