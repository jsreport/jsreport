/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path");
    bootstrapper = require("../lib/bootstrapper.js");

describe('bootstrapper', function () {

    it('should not fail', function (done) {
        bootstrapper({
            cluster: {
                numberOfWorkers : 2,
                enabled : false
            },
            connectionString: { name: "neDB"},
            rootDirectory: path.join(__dirname, "../")
        }).start().then(function() {
            done();
        }).catch(done);
    });
});
