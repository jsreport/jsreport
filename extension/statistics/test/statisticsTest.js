var assert = require("assert"),
    Statistics = require("../lib/statistics.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(["statistics"], function(reporter) {
    describe('statistics', function() {

        it('should increase amount number second time', function (done) {
            
            var request = {
                reporter: reporter,
                template: { },
                options: { async: true }
            };
            
            reporter.templates.create({ html: "foo" }).then(function (t) {
                request.template = t;
                
                var response = {};

                reporter.statistics.handleAfterRender(request, response).then(function () {
                    
                    reporter.statistics.handleAfterRender(request, response).then(function () {
                        
                        reporter.statistics.entitySet.toArray().then(function (stats) {
                            reporter.logger.info("Here2" + stats);
                            assert.equal(1, stats.length);
                          
                            assert.equal(request.template.name, stats[0].templateName);
                            assert.equal(2, stats[0].amount);
                            done();
                        });
                    });
                });
            });
        });

        it('should group by template', function(done) {
            var request = {
                reporter: reporter,
                template: { html: "html"},
                options: { async: true }
            };
            var response = {};

            reporter.templates.create({ html: "foo" }).then(function(t) {
                request.template = t;
                
                reporter.statistics.handleAfterRender(request, response).then(function () {

                    reporter.templates.create({ html: "foo" }).then(function(differentTemplate) {
                        request.template = differentTemplate;

                        reporter.statistics.handleAfterRender(request, response).then(function () {
                            
                            reporter.statistics.entitySet.toArray().then(function(stats) {
                                assert.equal(2, stats.length);
                                assert.equal(1, stats[0].amount);
                                assert.equal(1, stats[1].amount);
                                done();
                            });
                        });
                    });
                });
            });
         });

           
    });
});