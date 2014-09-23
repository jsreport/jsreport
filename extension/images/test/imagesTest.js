/*globals describe, it, beforeEach, afterEach */

var fs = require("fs"),
    Buffer = require("buffer").Buffer,
    assert = require("assert"),
    request = require('supertest'),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(path.join(__dirname, "../../"), ["express", "templates", "images"], function(reporter) {

    describe('images', function() {

        it('shoulb be able to upload', function(done) {
            reporter.images.upload(reporter.context, "test", "image/jpeg", new Buffer([1, 2, 3]))
                .then(function() { return reporter.context.images.toArray(); })
                .then(function(res) {
                    assert.equal(1, res.length);
                    done();
                }).catch(done);
        });

        it('express get by name for not existing image should return not found', function(done) {
            request(reporter.options.express.app)
                .get('/api/image/name/foo')
                .expect(404, done);
        });

        it('express post and get by name should return image', function(done) {
            request(reporter.options.express.app)
                .post('/api/image')
                .attach('avatar', path.join(__dirname, 'testImg.png'))
                .field('originalname', 'testImg')
                .expect(200)
                .set('Accept', 'application/json')
                .end(function(err, res) {
                    if (err)
                        throw err;

                    assert.notEqual(null, JSON.parse(res.text).shortid);

                    request(reporter.options.express.app)
                        .get('/api/image/name/testImg')
                        .expect(200, done);
                });
        });

        it('should replace image tag with base64 content', function(done) {
            reporter.images.upload(reporter.context, "test withSpace", "image/jpeg", new Buffer([1, 2, 3]))
                .then(function() {
                    var request = {
                        context: reporter.context
                    };

                    var response = {
                        result: "a{#image test withSpace}"
                    };

                    reporter.images.handleAfterTemplatingEnginesExecuted(request, response).then(function() {
                        assert.equal("adata:image/jpeg;base64," + new Buffer([1, 2, 3]).toString('base64'), response.result);
                        done();
                    }).catch(done);
                }).catch(done);
        });
    });
});