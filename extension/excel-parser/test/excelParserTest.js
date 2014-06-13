/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    fs = require('fs'),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["excel-parser"], function (reporter) {

    describe('excel-parser', function () {

        it('should parse test xsl file to req.data json', function (done) {
            var req = {
                files: {
                    file : {
                        path: path.join(__dirname, "test-data.xls")
                    }
                }
            };

            var res = {};

            reporter.beforeRenderListeners.fire(req, res).then(function() {
                assert.equal(req.data.rows[0].b, "wef");
                done();
            }).catch(done);
        });

    });
});

