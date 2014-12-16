/*globals describe, it, beforeEach, afterEach */

var should = require("should"),
    index = require("../index.js"),
    q = require("q");

describe('index.js', function () {

    it('should be able to use shortcut', function (done) {
        require("../lib/reporter.js").instance = null;

        index.render({ template: { content: "foo", recipe: "html"} }).then(function(response) {
            response.result.should.be.exactly("foo");
            done();
        }).catch(done);
    });
});