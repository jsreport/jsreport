var Reporter = require("../reporter.js"),
    jaydata = require("odata-server"),
    _ = require("underscore"),
    async = require("async"),
    MongoClient = require('mongodb').MongoClient;


exports.describeReportingPlayground = function(extensions, nestedSuite) {
    exports.describeReporting(extensions, true, nestedSuite);
};

exports.describeReporting = function (extensions, isPlayground, nestedSuite) {
    if (_.isFunction(isPlayground)) {
        nestedSuite = isPlayground;
        isPlayground = false;
    }

    describe("reporting", function () {
        
        var reporter = new Reporter({
            playgroundMode: isPlayground,
            tenant: { name: "test"},
            connectionString: { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 },
            extensions: _.union(["templates", "html", "phantom", "fop", "data", "reports", "statistics"], extensions),
            loadExtensionsFromPersistedSettings: false
        });
       
        beforeEach(function (done) {
            this.timeout(10000);
            reporter.init(function () {
                     done();
            });
        });
        

        afterEach(function(done) {
            this.timeout(10000);
            async.eachSeries(reporter.context.getType().memberDefinitions.asArray(), function (memDef, cb) {
                        if (memDef.dataType == $data.EntitySet) {
                            reporter.context[memDef.name].deleteEnabled = true;
                            reporter.context[memDef.name].toArray().then(function (ents) {
                                _.each(ents, function (ent) { ent.remove(); });
                                cb();
                            });
                        } else {
                            cb();
                        }
                    }, function () {
                        reporter.context.saveChanges().then(function() {
                             done();
                        });
                    });
        });

        nestedSuite(reporter);
    });
};
