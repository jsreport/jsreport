var assert = require("assert"),
    fs = require('fs'),
    async = require("async"),
    join = require("path").join,
    describeReporting = require("../../../test/helpers.js").describeReporting,
    Q = require("q"),
    supertest = require('supertest');

describeReporting([], function(reporter) {

    describe('express', function() {

        it('/html-templates should return 200', function(done) {
            supertest(reporter.options.express.app)
                .get('/html-templates')
                .expect(200, done);
        });

        it('/api/settings should return 200', function(done) {
            supertest(reporter.options.express.app)
                .get('/api/settings')
                .expect(200, done);
        });

        it('/api/recipe should return 200', function(done) {
            supertest(reporter.options.express.app)
                .get('/api/recipe')
                .expect(200, done);
        });

        it('/api/report should render report', function(done) {
            supertest(reporter.options.express.app)
                .post('/api/report')
                .send({ template: { content: "Hey", engine: "handlebars", recipe: "html" } })
                .expect(200, "Hey")
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        });

        it('/api/report should parse data if string and  render report', function(done) {
            supertest(reporter.options.express.app)
                .post('/api/report')
                .send({ template: { content: "{{:a}}", engine: "jsrender", recipe: "html" }, data: "{ \"a\": \"foo\" }" })
                .expect(200, "foo")
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        });
        
        it('/odata/templates should return 200', function(done) {
            supertest(reporter.options.express.app)
                .get('/odata/templates')
                .expect(200, done);
        });
    });
});