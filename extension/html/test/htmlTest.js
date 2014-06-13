/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    fs = require('fs'),
    _ = require('underscore'),
    path = require("path"),
    Html = require("../lib/html.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["html"], function(reporter) {
    describe('html', function() {

        beforeEach(function() {
            this.html = new Html(reporter);
        });

        it('should be rendered', function(done) {

            var request = {
                options: { type: "html", timeout: 5000 },
                reporter: reporter,
                template: { content: "Hey" },
                data: null
            };

            var response = { headers: {}};

            _.findWhere(reporter.extensionsManager.recipes, { name: "html" }).execute(request, response).then(function () {
                assert.equal("Hey", response.result);
                done();
            });
        });

    });
});
