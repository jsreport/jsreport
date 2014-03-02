var assert = require("assert"),
    fs = require('fs'),
    path = require("path"),
    _ = require("underscore"),
    Phantom = require("../lib/phantom.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting([], function(reporter) {
    describe('phantom pdf', function () {
     
        it('should not fail when rendering', function(done) {
            this.timeout(5000);
            
            var request = {
                options: { recipe: "phantom", timeout: 5000 },
                reporter: reporter,
                template: { content: "Heyx" },
                data: null
            };

            var response = { headers : {}};

            _.findWhere(reporter.extensionsManager.recipes, { name: "phantom-pdf" }).execute(request, response).then(function() {
                done();
            });
        });

    });
});
