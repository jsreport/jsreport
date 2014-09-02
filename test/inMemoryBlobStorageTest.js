/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    fs = require("fs"),
    util = require("../lib/util/util.js"),
    shortid = require("shortid"),
    InMemoryBlobStorage = require("../lib/blobStorage/inMemoryBlobStorage.js"),
    tmpDir = require("os").tmpDir(),
    Readable = require("stream").Readable;

describe('inMemoryBlobStorage', function () {

    it('write and read should result into equal string', function(done) {
        var blobStorage = new InMemoryBlobStorage({});

        blobStorage.write("foo", new Buffer("Hula"), function(err) {
            assert.ifError(err);

            blobStorage.read("foo", function(er, stream) {
                assert.ifError(er);

                var content = '';
                stream.on('data', function(buf) { content += buf.toString(); });
                stream.on('end', function() {
                    assert.equal(content, "Hula");
                    done();
                });
            });
        });
    });

});