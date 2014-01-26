var assert = require("assert"),
    fs = require('fs'),
    async = require("async"),
    join = require("path").join,
    Reports = require("../lib/reports.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    Q = require("q");

describeReporting([], function(reporter) {

    describe('reporting', function() {

        it('should insert report to storage', function(done) {

            var request = {
                options: { recipe: "html", async: true },
                context: reporter.context,
                template: {
                    name: "name",
                    recipe: "html",
                    generatedReportsCounter: 2
                }
            };
            var response = {
                result: "Hey"
            };

            reporter.reports.handleAfterRender(request, response).then(function() {
                async.series([
                    function(cb) {
                        reporter.blobStorage.read(response.result.blobName, function(err, stream) {
                            var htmlContent = "";
                            stream.on('data', function(chunk) {
                                htmlContent += chunk;
                            });

                            stream.on("end", function() {
                                assert.equal("Hey", htmlContent);
                                cb(null);
                            });
                        });                              
                              

                    }
                ], function() { done(); });
            });
        });
    });
});