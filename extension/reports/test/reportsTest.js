/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    fs = require('fs'),
    async = require("async"),
    join = require("path").join,
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    supertest = require('supertest');

describeReporting(path.join(__dirname, "../../"), ["templates", "express", "reports"], function(reporter) {

    describe('with reports extension', function() {

        it('should insert report to storage', function(done) {

            var request = {
                options: { recipe: "html", saveResult: true, isRootRequest: true },
                context: reporter.context,
                reporter: reporter,
                template: {
                    name: "name",
                    recipe: "html"
                },
                headers: {}
            };
            var response = {
                result: new Buffer("Hey"),
                headers: {}
            };

            reporter.reports.handleAfterRender(request, response).then(function() {
                supertest(reporter.options.express.app)
                    .get('/reports/' + response.headers["Report-Id"] + '/content')
                    .expect(200)
                    .parse(function(res, cb) {
                        res.data = '';
                        res.on('data', function(chunk) {
                            res.data += chunk;
                        });
                        res.on('end', function() {
                            cb(null, res.data);
                        });
                    })
                    .end(function(err, res) {
                        assert.equal("Hey", res.body);
                        done();
                    });
            }).catch(done);
        });

    });
});

