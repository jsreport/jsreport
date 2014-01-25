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

    afterEach(function() {
        //   util.deleteFiles("test-output");
    });

    it('should be able to write from string stream', function(done) {
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

    //it('should be able to write from file stream', function (done) {
    //    var self = this;

    //    var ms = fs.createReadStream("package.json");

    //    self.blobStorage.write(shortid.generate(), ms, function (err, blobName) {
    //        assert.ifError(err);

    //        fs.readFile(join(self.blobStorage.options.root, blobName), function (er, content) {
    //            fs.readFile("package.json", function (errr, origContent) {
    //                assert.equal(origContent + "", content + "");
    //                done();
    //            });
    //        });
    //    });
    //});
});