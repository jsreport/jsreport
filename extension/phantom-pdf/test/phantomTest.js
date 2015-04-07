/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    fs = require('fs'),
    path = require("path"),
    _ = require("underscore"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["html", "templates", "phantom-pdf"], function(reporter) {

    describe('phantom pdf', function () {
     
        it('should not fail when rendering', function(done) {
            var request = {
                template: { content: "Heyx", recipe: "phantom-pdf", engine:"jsrender" },
                data: null
            };

            reporter.render(request, {}).then(function(response) {
                done();
            }).catch(done);
        });

    });
});
