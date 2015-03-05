/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    fs = require('fs'),
    path = require("path"),
    Q = require("q"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

var authOptions = {
    "authentication": {
        "cookieSession": {
            "secret": "dasd321as56d1sd5s61vdv32"
        },
        "admin": {
            "username": "admin",
            "password": "password"
        }
    }
};

describeReporting(path.join(__dirname, "../../"), ["templates", "authentication", "authorization", "public-templates"], authOptions, function (reporter) {

    describe('public-templates', function () {

        it('test', function (done) {
            done();
        });
    });
});