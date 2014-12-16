/*globals describe, it, beforeEach, afterEach */

var should = require("should"),
    index = require("../index.js"),
    q = require("q");

describe('index.js', function () {

    it('should fire listeners callback', function (done) {
        index.render({ template: { content: "foo", recipe: "html"} }).then(function(response) {
            response.result.should.be.exactly("foo");
            done();
        }).catch(done);
    });
});