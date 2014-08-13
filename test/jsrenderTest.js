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

    it('should be able to parse and use sub tempates', function () {
        var childTemplate = "<script id=\"inner\" type=\"text/x-jsrender\">{{:#data}}</script>";
        var template = "{{for items tmpl=\"inner\"}}{{/for}}";
        var html = jsrender(childTemplate + template, null, { items : [1,2,3]});
        assert.equal(html, "123");
    });

    it('should be able to parse and use multiple sub tempates', function () {
        var childTemplate = "<script id=\"inner\" type=\"text/x-jsrender\">{{:#data}}</script>\n<script id=\"inner2\" type=\"text/x-jsrender\">a{{:#data}}</script>";
        var template = "{{for items tmpl=\"inner\"}}{{/for}}{{for items tmpl=\"inner2\"}}{{/for}}";
        var html = jsrender(childTemplate + template, null, { items : [1,2,3]});
        assert.equal(html, "\n123a1a2a3");
    });
});