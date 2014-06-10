/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    render = require("../lib/render/render.js"),
    assert = require("assert");

describe('render', function () {

    it('rendering should fill response.result', function (done) {
        var request = {
            template: {
                content: "foo"
            },
            options: { timeout: 1000}
        };
        render(request, {}, function(err, response) {
            assert.ifError(err);
            
            assert.equal("foo", response.result);
            done();
        });
    });
    
    it('rendering should fill error when engine fails', function (done) {
        var request = {
            template: {
                content: "foo{{if}}"
            },
            options: { timeout: 1000}
        };
        render(request, {}, function(err, response) {
            assert.notEqual(null, err);
            done();
        });
    });
    
     it('reporting should timeout for long child execution', function (done) {
        var request = {
            template: {
                content: "foo"
            },
            options: { timeout: 0}
        };
        render(request, {}, function(err, response) {
            assert.notEqual(null, err);
            done();
        });
    });
    
    it('rendering should block require', function (done) {
        var request = {
            template: {
                content: "{{:~fs()}}",
                helpers: "{ \"fs\" : function() { return require('fs') != null; } }"
            },
            options: { timeout: 1000}
        };
        
        render(request, {}, function(err, response) {
            assert.notEqual(err, null);
            done();
        });
    });
    
    it('rendering should be able to evaluate global function helpers', function (done) {
        var request = {
            template: {
                engine: "jsrender",
                content: "{{:~foo()}}",
                helpers: "function foo() { return 'test'; }"
            },
            options: { timeout: 1000}
        };
        
        render(request, {}, function(err, response) {
            assert.equal('test', response.result);
            done();
        });
    });
    
    it('rendering should be able to evaluate object based helpers', function (done) {
        var request = {
            template: {
                engine: "jsrender",
                content: "{{:~foo()}}",
                helpers: "{ \"foo\" : function() { return 'test'; } }"
            },
            options: { timeout: 1000}
        };
        
        render(request, {}, function(err, response) {
            assert.equal('test', response.result);
            done();
        });
    });
});