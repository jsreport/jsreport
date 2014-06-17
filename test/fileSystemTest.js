/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    util = require("../lib/util/util.js"),
    shortid = require("shortid"),
    FileSystem = require("../lib/blobStorage/fileSystem.js"),
    tmpDir = require("os").tmpDir(),
    Readable = require("stream").Readable;

describe('fileSystem', function () {
    
    beforeEach(function () {
        this.blobStorage = new FileSystem({ root: path.join(tmpDir, "test-output") });
        util.deleteFiles(this.blobStorage.options.root);
    });

    afterEach(function () {
    });

    it('write and read should result into equal string', function(done) {
        var self = this;

        var ms = new Readable();
        ms.push("Hey");
        ms.push(null);

        var blobName = shortid.generate();

        self.blobStorage.write(blobName, new Buffer("Hula"), function(err) {
            assert.ifError(err);

            self.blobStorage.read(blobName, function(er, stream) {
                assert.ifError(er);

                var content = '';
                stream.resume();
                stream.on('data', function(buf) { content += buf.toString(); });
                stream.on('end', function() {
                    assert.equal("Hula", content);
                    done();
                });
            });
        });
    });

});