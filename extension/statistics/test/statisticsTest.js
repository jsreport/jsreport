/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(path.join(__dirname, "../../"), ["templates", "statistics"], function(reporter) {

    describe('statistics', function() {

        it('before should group and increase just amount', function (done) {
            
            var request = {
                reporter: reporter,
                context: reporter.context,
                template: { },
                options: { async: true}
            };
            
            reporter.documentStore.collection("templates").insert({ content: "foo" }).then(function (t) {
                request.template = t;
                
                var response = {};

                return reporter.statistics.handleBeforeRender(request, response).then(function () {
                    
                    return reporter.statistics.handleBeforeRender(request, response).then(function () {
                        
                        return reporter.documentStore.collection("statistics").find({}).then(function (stats) {
                            assert.equal(1, stats.length);
                            assert.equal(2, stats[0].amount);
                            assert.equal(undefined, stats[0].success);
                            done();
                        });
                    });
                });
            }).catch(done);
        });
        
        it('after should increase success', function (done) {
            
            var request = {
                reporter: reporter,
                context: reporter.context,
                template: { },
                options: { async: true }
            };

            reporter.documentStore.collection("templates").insert({ content: "foo" }).then(function (t) {
                request.template = t;
                
                var response = {};

                return reporter.statistics.handleBeforeRender(request, response).then(function () {
                    
                    return reporter.statistics.handleAfterRender(request, response).then(function () {
                        
                        return reporter.documentStore.collection("statistics").find({}).then(function (stats) {
                            assert.equal(1, stats.length);
                            assert.equal(1, stats[0].amount);
                            assert.equal(1, stats[0].success);
                            done();
                        });
                    });
                }).catch(done);
            });
        });
    });
});