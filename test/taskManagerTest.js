/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    q = require("q"),
    TaskManager = require("../lib/tasks/taskManager.js"),
    should = require("should");


describe('taskManager', function () {

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

    it('worker script should be able to return simple value', function (done) {
        taskManager.execute({
            body: { script: "res.send(\"foo\");" },
            execModulePath: path.join(__dirname, "testingScript.js")
        }).then(function (resp) {
            assert.equal(resp, "foo");
            done();
        }).fail(done);
    });

    it('should fail with timeout when infinite loop', function (done) {
        taskManager.execute({
            body: { script: "while(true) { }; res.send(\"foo\");" },
            execModulePath: path.join(__dirname, "testingScript.js"),
            timeout: 1000
        }).fail(function() {
            //error is ok
            done();
        });
    });

    it('should be able to response error and promise should then fail', function (done) {
        taskManager.execute({
            body: { script: "throw new Error(\"foo\");" },
            execModulePath: path.join(__dirname, "testingScript.js"),
            timeout: 1000
        }).fail(function(e) {
            e.message.should.containEql("foo");
            e.stack.should.containEql("testingScript");
            done();
        }).fail(done);
    });
});