/*globals describe, it, beforeEach, afterEach */


if (process.env.DB === "neDB")
    return;

var assert = require("assert"),
    shortid = require("shortid"),
    Reporter = require("../lib/reporter.js"),
    GridFS = require("../lib/blobStorage/gridFSBlobStorage.js"),
    Readable = require("stream").Readable,
    DataProvider = require("../lib/dataProvider.js"),
    connectionString = require("./helpers.js").connectionString;

describe('gridFSBlobStorage', function() {

    beforeEach(function(done) {
        var self = this;
        self.dataProvider = new DataProvider(connectionString, { logger: new(require("../lib/util/consoleLogger"))()});
        self.dataProvider.buildContext();

        self.dataProvider.dropStore().then(function() {
            self.blobStorage = new GridFS(connectionString);
            done();
        }, done);
    });

    it('write and read should result into equal string', function(done) {
        var self = this;

        var ms = new Readable();
        ms.push("Hey");
        ms.push(null);

        var blobName = shortid.generate();

        self.blobStorage.write(blobName, new Buffer("Hula"), function(err) {
            console.log("F");
            assert.ifError(err);

            self.blobStorage.read(blobName, function(er, stream) {
                var content = '';
                stream.resume();
                stream.on('data', function(buf) { content += buf.toString(); });
                stream.on('end', function() {
                    assert.equal(content, "Hula");
                    done();
                });
            });
        });
    });
});