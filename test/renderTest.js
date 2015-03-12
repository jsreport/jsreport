/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    render = require("../lib/render/render.js"),
    assert = require("assert"),
    q = require("q"),
    ScriptManager = require("script-manager").ScriptManager;


describe('render', function () {

    var scriptManager = new ScriptManager({ numberOfWorkers: 1});

    beforeEach(function (done) {
        scriptManager.ensureStarted(done);
    });

    afterEach(function (done) {
        done();
    });

    it('rendering should be able to evaluate global function helpers', function (done) {
        var request = {
            template: {
                engine: "jsrender",
                content: "{{:~foo()}}",
                helpers: "function foo() { return 'test'; }"
            },
            scriptManager: scriptManager,
            options: { timeout: 1000}
        };

        render(request, {}).then(function(response) {
            assert.equal('test', response.result);
            done();
        }).fail(done);
    });

    it('rendering should fill response.result', function (done) {
        var request = {
            template: {
                content: "foo"
            },
            scriptManager: scriptManager,
            options: { timeout: 1000}
        };
        render(request, {}).then(function(response) {
            assert.equal("foo", response.result);
            done();
        }).fail(done);
    });

    it('rendering should fill error when engine fails', function (done) {
        var request = {
            template: {
                content: "foo{{if}}"
            },
            options: { timeout: 1000}
        };
        render(request, {}).fail(function() {
            done();
        });
    });
    
    it('reporting should timeout for long child execution', function (done) {
        var request = {
            template: {
                content: "{{:~a()}}",
                helpers: "function a() { while(true) {; } }"
            },
            scriptManager: scriptManager,
            options: { timeout: 0 }
        };
        render(request, {}).then(function(res) {
            console.log(res);
            done(new Error("It should have failed"));
        }).catch(function() {
            done();
        });
    });
    
    it('rendering should block require', function (done) {
        var request = {
            template: {
                content: "{{:~fs()}}",
                helpers: "{ \"fs\" : function() { return require('fs') != null; } }"
            },
            scriptManager: scriptManager,
            options: { timeout: 1000}
        };

        render(request, {}).then(function() {
            done(new Error("It should have failed"));
        }).catch(function() {
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
            scriptManager: scriptManager,
            options: { timeout: 1000}
        };

        render(request, {}).then(function(response) {
            assert.equal('test', response.result);
            done();
        }).fail(done);
    });
});