var fs = require("fs"),
    Buffer = require("buffer").Buffer,
    assert = require("assert"),
    request = require('supertest'),
    path = require("path");
describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(["images"], function(reporter) {

    describe('images', function() {

        it('shoulb be able to upload', function(done) {
            reporter.images.upload("test", "image/jpeg", new Buffer([1, 2, 3]))
                .then(function() { return reporter.images.entitySet.toArray(); })
                .then(function(res) {
                    assert.equal(1, res.length);
                    done();
                });
        });

        it('express get by name for not existing image should return not found', function(done) {
            request(reporter.options.express.app)
                .get('/api/image/name/foo')
                .expect(404, done);
        });

        it('express post and get by name should return image', function(done) {
            request(reporter.options.express.app)
                .post('/api/image/')
                .attach('avatar', path.join(__dirname, 'testImg.png'))
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
    });
});