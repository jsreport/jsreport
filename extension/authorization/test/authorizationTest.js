/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    authApp = require("express")(),
    should = require("should"),
    ObjectID = require('mongodb').ObjectID,
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["templates", "authentication", "authorization"], function(reporter) {

    describe('authorization', function () {


        beforeEach(function (done) {
            reporter.authentication = {};
            done();
        });

        afterEach(function () {
        });

        function runInUserDomain(id, fn) {
            var d = require('domain').create();
            d.req = { user : { _id: id}};

            d.run(fn);
        }

        function createTemplate(userId, done, error) {
            runInUserDomain(userId, function() {
                reporter.dataProvider.startContext().then(function(context) {
                    return reporter.templates.create(context, { content: "foo" }).then(function() {
                        done();
                    });
                }).catch(error);
            });
        }

        function countTemplates(userId, done, error) {
            runInUserDomain(userId, function() {
                reporter.dataProvider.startContext().then(function(context) {
                    return context.templates.toArray().then(function(res) {
                        done(res.length);
                    });
                }).catch(error);
            });
        }

        var userId1 = "NTRiZTU1MTFiY2NkNmYzYzI3OTdiNjYz";
        var userId2 = "NTRiZTVhMzU5ZDI4ZmU1ODFjMTI4MjMy";

        it('user creating entity should be able to read it', function (done) {
            createTemplate(userId1, function() {
                countTemplates(userId1, function(count) {
                    count.should.be.eql(1);
                    done();
                }, done);
            }, done);
        });

        it('user should not be able to read entity without permission to it', function (done) {
            createTemplate(userId1, function() {
                console.log("counting templtates");
                countTemplates(userId2, function(count) {
                    count.should.be.eql(0);
                    done();
                }, done);
            }, done);
        });

        it('query should filter out entities without permissions', function (done) {
            createTemplate(userId1, function() {
                createTemplate(userId2, function() {
                    countTemplates(userId1, function(count) {
                        count.should.be.eql(1);
                        done();
                    }, done);
                }, done);

            }, done);
        });
    });
});

