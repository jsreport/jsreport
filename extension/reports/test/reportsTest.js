//var assert = require("assert"),
//    fs = require('fs'),
//    async = require("async"),
//    join = require("path").join,
//    Reports = require("../lib/reports.js"),
//    describeReporting = require("../../../test/helpers.js").describeReporting,
//    Q = require("q");

//describeReporting([], function (reporter) {

//    describe('reporting', function () {

//        it('should insert report to storage', function (done) {

//            var request = {
//                options: { recipe: "html", async: true },
//                template: {
//                    name: "name",
//                    recipe: "html",
//                    generatedReportsCounter: 2
//                }
//            };
//            var response = {
//                result: "Hey"
//            };
            
//            reporter.reports.handleAfterRender(request, response).then(function() {
//                        async.series([
//                            function (cb) {
//                                reporter.reports.entitySet.find(response.result._id).then(function (report) {
//                                    assert.equal(request.options.recipe, report.recipe);
                                   
//                                    assert.notEqual(null, report.creationDate);
//                                    assert.equal(request.template.name + "-" + (request.template.generatedReportsCounter - 1), report.name);
//                                    assert.equal(3, request.template.generatedReportsCounter);

//                                    cb(null);
//                                });
//                            },
//                            function (cb) {
//                                var stream = reporter.blobStorage.read(response.result.blobName);
                              
//                                var htmlContent = "";
//                                stream.on('data', function(chunk) {
//                                    htmlContent += chunk;
//                                });

//                                stream.on("end", function() {
//                                    assert.equal("Hey", htmlContent);
//                                    cb(null);
//                                });

//                            }
//                        ], function() { done(); });
//                    });
//        });
//    });
//});