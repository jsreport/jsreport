/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    render = require("../lib/render/render.js"),
    assert = require("assert"),
    TaskManager = require("../lib/tasks/taskManager.js");


describe('render', function () {

    var taskManager = new TaskManager({});

    beforeEach(function (done) {
        this.timeout(10000);
        taskManager.start().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        taskManager.kill();
        done();
    });

    it('rendering should fill response.result', function (done) {
        var request = {
            template: {
                content: "foo"
            },
            taskManager: taskManager,
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
                content: "foo"
            },
            taskManager: taskManager,
            options: { timeout: 1}
        };
        render(request, {}).fail(function() {
            done();
        });
    });
    
    it('rendering should block require', function (done) {
        var request = {
            template: {
                content: "{{:~fs()}}",
                helpers: "{ \"fs\" : function() { return require('fs') != null; } }"
            },
            taskManager: taskManager,
            options: { timeout: 1000}
        };

        render(request, {}).fail(function(err, response) {
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
            taskManager: taskManager,
            options: { timeout: 1000}
        };

        render(request, {}).then(function(response) {
            assert.equal('test', response.result);
            done();
        }).fail(done);
    });

    it('rendering should be able to evaluate object based helpers', function (done) {
        var request = {
            template: {
                engine: "jsrender",
                content: "{{:~foo()}}",
                helpers: "{ \"foo\" : function() { return 'test'; } }"
            },
            taskManager: taskManager,
            options: { timeout: 1000}
        };

        render(request, {}).then(function(response) {
            assert.equal('test', response.result);
            done();
        }).fail(done);
    });
});