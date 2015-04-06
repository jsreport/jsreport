/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    should = require("should"),
    ListenerCollection = require("../lib/util/listenerCollection.js"),
    q = require("q");

describe('ListenersCollection', function () {

    beforeEach(function () {
        this.listeners = new ListenerCollection();
    });

    it('should fire listeners callback', function (done) {
        var invokeCount = 0;

        this.listeners.add("test", function (next) {
            invokeCount++;
            next();
        });

        this.listeners.fire(function () {
            assert.equal(1, invokeCount);
            done();
        });
    });

    it('remove listener should remove function', function (done) {
        var invokeCount = 0;

        this.listeners.add("test", function (next) {
            invokeCount++;
            next();
        });

        this.listeners.remove("test");

        this.listeners.fire(function () {
            assert.equal(0, invokeCount);
            done();
        });
    });


    it('should fire listeners with arguments', function (done) {

        this.listeners.add("test", function (a, b, next) {

            assert.equal("param1", a);
            assert.equal("param2", b);
            next();
        });

        this.listeners.fire("param1", "param2", function () {
            done();
        });
    });

    it('should be able to use context', function (done) {
        var context = {x: 1};
        this.listeners.add("test", context, function (next) {
            assert.equal(1, this.x);
            next();
        });

        this.listeners.fire(function () {
            done();
        });
    });

    it('insert should respect the after condition', function (done) {
        var invocations = [];

        this.listeners.add("test", function (next) {
            invocations.push("test");
            next();
        });

        this.listeners.add("test3", function (next) {
            invocations.push("test3");
            next();
        });

        this.listeners.insert({ after: "test"}, "test2", this, function (next) {
            invocations.push("test2");
            next();
        });


        this.listeners.fire(function () {
            invocations.should.have.length(3);
            invocations[0].should.be.eql("test");
            invocations[1].should.be.eql("test2");
            invocations[2].should.be.eql("test3");
            done();
        });
    });

    it('insert should respect the after and before condition', function (done) {
        var invocations = [];


        this.listeners.add("test3", function (next) {
            invocations.push("test3");
            next();
        });

        this.listeners.insert({ after: "test", "before": "test3" }, "test2", this, function (next) {
            invocations.push("test2");
            next();
        });


        this.listeners.fire(function () {
            invocations.should.have.length(2);
            invocations[0].should.be.eql("test2");
            invocations[1].should.be.eql("test3");
            done();
        });
    });

    it('insert should work if the conditioned element not present', function (done) {
        var invocations = [];

        this.listeners.add("test3", function (next) {
            invocations.push("test3");
            next();
        });

        this.listeners.insert("test2", this, { after: "test"}, function (next) {
            invocations.push("test2");
            next();
        });


        this.listeners.fire(function () {
            invocations.should.have.length(2);
            invocations[0].should.be.eql("test3");
            invocations[1].should.be.eql("test2");
            done();
        });
    });


    it('firePromise should return a valid awaitable promise', function (done) {

        this.listeners.add("test", function () {
            return q(1);
        });
        this.listeners.add("test", function () {
            return q(2);
        });

        this.listeners.fire().then(function (res) {
            assert.equal(1, res[0]);
            assert.equal(2, res[1]);
            done();
        });
    });

    it('firePromise should fire with arguments', function (done) {
        var obj = {};

        this.listeners.add("test", function (o) {
            o.a = true;
        });

        this.listeners.fire(obj).then(function () {
            assert.equal(true, obj.a);
            done();
        });
    });

    it('firePromise should return a valid promise that can catch errors', function (done) {
        this.listeners.add("test", function () {
            return q.reject(new Error("foo"));
        });

        this.listeners.fire().fail(function () {
            done();
        });
    });

    it('firePromise rethrow error', function (done) {
        var listeners2 = new ListenerCollection();
        listeners2.add("test", function () {
            return q().then(function() {
                var defer = q.defer();
                setTimeout(function () {
                    defer.reject(new Error("foo"));
                }, 0);

                return defer.promise;
            });
        });

        this.listeners.add("test", function () {
            return q().then(function() {
                var defer = q.defer();
                setTimeout(function() {
                    defer.resolve("ok");
                },0);

                return defer.promise;
            });
        });

        this.listeners.fire().then(function() {
            return listeners2.fire();
        }).fail(function (e) {
            throw e;
        }).fail(function(e) {
            done();
        });
    });

    it('firePromise should apply pre hooks', function (done) {
        var i = 0;
        this.listeners.pre(function () {
            i++;
        });
        this.listeners.pre(function () {
            i++;
        });
        this.listeners.add("test", function () {
            return q(1);
        });

        this.listeners.fire().then(function (res) {
            assert.equal(2, i);
            done();
        });
    });

    it('firePromise should apply post hooks', function (done) {
        var postResult;
        this.listeners.post(function () {
            postResult = this.key;
        });

        this.listeners.add("test", function () {
            return q(1);
        });

        this.listeners.fire().then(function (res) {
            assert.equal("test", postResult);
            done();
        });
    });

    it('firePromise should apply postError hooks', function (done) {
        var error;
        this.listeners.postFail(function (err) {
            error = err;
        });

        this.listeners.add("test", function () {
            return q.reject(new Error("foo"));
        });

        this.listeners.fire().fail(function (err) {
            assert.equal(err, error);
            done();
        });
    });

});