/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    join = require("path").join,
    util = require("../lib/util/util.js"),
    shortid = require("shortid"),
    GridFS = require("../lib/blobStorage/gridFS.js"),
    MemoryStream = require('memorystream'),
    Readable = require("stream").Readable,
    MongoClient = require("mongodb").MongoClient;


describe('gridFS', function() {

    beforeEach(function() {
        var self = this;
        self.blobStorage = new GridFS({ name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 });
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