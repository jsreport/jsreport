/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    authApp = require("express")();
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["templates", "authorization"], { "authorization" : { "externalService" : { "url": "http://localhost:1234" } }}, function(reporter) {

    describe('authorization', function () {

        var statusCode;
        var authServer;
        beforeEach(function (done) {
            statusCode = 200;
            authApp.get('/jsreport/authorization/:operation/:type/:shortid', function (req, res) {
                res.status(statusCode).end();
            });

            authServer = authApp.listen(1234, function () {
                done();
            })
        });

        afterEach(function () {
            authServer.close();
        });

        it('should pass when external service returns 200', function (done) {
            var d = require('domain').create();
            d.req = { headers : {}};

            d.run(function() {
                reporter.dataProvider.startContext().then(function(context) {
                    return reporter.templates.create(context, { content: "foo" }).then(function() {
                        done();
                    });
                }).catch(done);
            });
        });

        it('should NOT pass when external service returns 401', function (done) {
            var d = require('domain').create();
            d.req = { headers : {}};

            statusCode = 401;

            d.run(function() {
                reporter.dataProvider.startContext().then(function(context) {
                    return reporter.templates.create(context, { content: "foo" }).then(function() {
                        done(new Error("Authorization should reject create"));
                    });
                }).catch(function() {
                    done();
                });
            });
        });

        it('should not call external service when user authenticated', function (done) {
            var d = require('domain').create();
            d.req = { headers : {}, user: {}};

            statusCode = 401;

            d.run(function() {
                reporter.dataProvider.startContext().then(function(context) {
                    return reporter.templates.create(context, { content: "foo" }).then(function() {
                        done();
                    });
                }).catch(done);
            });
        });

        it('read operation should remove unauthorized results from the resultset', function (done) {
            var d = require('domain').create();
            d.req = { headers : {}};

            d.run(function() {
                reporter.dataProvider.startContext().then(function(context) {
                    return reporter.templates.create(context, { content: "foo" }).then(function() {
                        statusCode = 401;
                        context.templates.toArray().then(function(templates) {
                            assert.equal(0, templates.length);
                            done();
                        });
                    });
                }).catch(done);
            });
        });
    });
});

describeReporting(path.join(__dirname, "../../"), ["authorization"], function(reporter) {

    describe('authorization without optinos', function () {
        beforeEach(function () {
        });

        it('should not fail', function (done) {
            done();
        });
    });
});
