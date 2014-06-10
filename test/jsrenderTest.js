/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    jsrender = require("../lib/render/jsrenderEngine.js");

describe('render jsrender', function () {

    it('should render html', function () {
        var html = jsrender("Hey", null, null);
        assert.equal("Hey", html);
    });

    it('should be able to use helpers', function () {
        var html = jsrender("{{>~a()}}", { a: function() { return "Hey"; } }, null);
        assert.equal("Hey", html);
    });

    it('should be able to use data', function () {
        var html = jsrender("{{:a}}", null, { a: "Hey" });
        assert.equal("Hey", html);
    });
    
    it('should throw when missing helper', function () {
        assert.throws(function() {
            jsrender("{{:~missing()}}", null, {});
        });
    });
    
    it('should throw when syntax error', function () {
        assert.throws(function () {
            jsrender("{{:~missing()}}", null, {});
        });
    });

});