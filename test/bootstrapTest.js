/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    bootstrapper = require("../lib/bootstrapper.js"),
    connectionString = require("./helpers.js").connectionString;

describe('bootstrapper', function () {

    it('should not fail', function (done) {
        this.timeout(5000);
        bootstrapper({
            connectionString: connectionString,
            rootDirectory: path.join(__dirname, "../"),
            extensions: ["templates"]
        }).start().then(function() {
            done();
        }).catch(done);
    });
});
