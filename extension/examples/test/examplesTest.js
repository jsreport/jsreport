var fs = require("fs"),
    assert = require("assert"),
    Statistics = require("../lib/examples.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(["scripts", "examples"], function (reporter) {

    describe('examples', function () {
        it('shoulb prepare examples', function (done) {
            reporter.context.templates.filter(function(t) { return t.isExample == true; }).toArray().then(function(res) {
                assert.equal(true, res.length > 0);
                done();
            });
        });
    });
});