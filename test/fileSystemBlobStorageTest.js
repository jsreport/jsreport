﻿/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    fs = require("fs"),
    util = require("../lib/util/util.js"),
    shortid = require("shortid"),
    FileSystem = require("../lib/blobStorage/fileSystemBlobStorage.js"),
    tmpDir = require("os").tmpDir(),
    Readable = require("stream").Readable;

describe('fileSystemBlobStorage', function () {
    
    beforeEach(function () {
        util.deleteFiles(path.join(tmpDir, "test-output"));

        if (!fs.existsSync(path.join(tmpDir, "test-output"))) {
            fs.mkdirSync(path.join(tmpDir, "test-output"));
        }

        this.blobStorage = new FileSystem({ dataDirectory: path.join(tmpDir, "test-output") });
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
            if (err)
                return done(err);

            self.blobStorage.read(blobName, function(er, stream) {
                if (err)
                    return done(err);

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