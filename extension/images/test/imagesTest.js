var fs = require("fs"),
    Buffer = require("buffer").Buffer,
    assert = require("assert"),
    Statistics = require("../lib/images.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(["images"], function (reporter) {

    describe('images', function () {

        it('shoulb be able to upload', function(done) {
            reporter.images.upload("test", "image/jpeg", new Buffer([1, 2, 3]))
                .then(function() { return reporter.images.entitySet.toArray(); })
                .then(function(res) {
                    assert.equal(1, res.length);
                    done();
                });
        });
    });
});