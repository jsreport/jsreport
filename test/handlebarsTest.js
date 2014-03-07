var expect = require('expect.js'),
    assert = require("assert"),
    handlebars = require("../render/handlebarsEngine.js");

describe('render handlebars', function () {

    it('should render html', function () {
        var html = handlebars("Hey", null, null);
        assert.equal("Hey", html);
    });

    it('should be able to use helpers', function () {
        var html = handlebars("{{{a}}}", { a: function() { return "Hey"; } }, null);
        assert.equal("Hey", html);
    });

    it('should be able to use data', function () {
        var html = handlebars("{{{a}}}", null, { a: "Hey" });
        assert.equal("Hey", html);
    });
    
    it('should throw when syntax error', function () {
        assert.throws(function () {
            handlebars("{{#if}}", null, {});
        });
    });

});