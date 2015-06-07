/*globals describe, it, beforeEach, afterEach */

var should = require("should"),
    index = require("../index.js"),
    q = require("q");

describe('index.js', function () {

    it('should be able to use shortcut', function (done) {
        require("../lib/reporter.js").instance = null;

        index.render({template: {content: "foo", recipe: "html", engine: "none"}}).then(function (response) {
            response.content.toString().should.be.exactly("foo");
            done();
        }).catch(done);
    });

    it('should be able to use shortcut for pdf and jsrender', function (done) {
        require("../lib/reporter.js").instance = null;

        index.render({template: {content: "foo", recipe: "phantom-pdf", engine: "handlebars"}}).then(function (response) {
            response.content.toString().should.containEql("%PDF");
            done();
        }).catch(done);
    });
});