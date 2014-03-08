var fs = require("fs"),
    assert = require("assert"),
    path = require("path"),
    Statistics = require("../lib/examples.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(path.join(__dirname, "../../"), ["scripts", "examples"], function (reporter) {

    describe('examples', function () {
        it('shoulb prepare examples', function (done) {
            reporter.context.templates.filter(function(t) { return t.isExample == true; }).toArray().then(function(res) {
                assert.equal(true, res.length > 0);
                done();
            });
        });
    });
});