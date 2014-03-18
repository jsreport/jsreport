var assert = require("assert"),
    fs = require('fs'),
    async = require("async"),
    join = require("path").join,
    path = require("path"),
    Reports = require("../lib/reports.js"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    Q = require("q"),
    supertest = require('supertest');

describeReporting(path.join(__dirname, "../../"), [], function(reporter) {

    describe('reporting', function() {

        it('should insert report to storage', function(done) {

            var request = {
                options: { recipe: "html", saveResult: true },
                context: reporter.context,
                template: {
                    name: "name",
                    recipe: "html",
                },
                headers: {}
            };
            var response = {
                result: "Hey",
                headers: {}
            };

            reporter.reports.handleAfterRender(request, response).then(function() {
                supertest(reporter.options.express.app)
                    .get('/api/report/' + response.headers["Report-Id"] + '/content')
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
            });
        });
    });
});