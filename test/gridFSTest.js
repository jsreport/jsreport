var assert = require("assert"),
    Reporter = require("../reporter.js"),
    fs = require('fs'),
    join = require("path").join,
    util = require("../util.js"),
    shortid = require("shortid"),
    GridFS = require("../blobStorage/gridFS.js"),
    MemoryStream = require('memorystream'),
    Readable = require("stream").Readable,
    MongoClient = require("mongodb").MongoClient;


describe('gridFS', function() {

    beforeEach(function(done) {
        var self = this;
        MongoClient.connect('mongodb://127.0.0.1:27017/test', {}, function(err, db) {
            self.blobStorage = new GridFS(db);
            done();
        });
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