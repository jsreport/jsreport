//var assert = require("assert"),
//    Reporter = require("../reporter.js"),
//    fs = require('fs'),
//    join = require("path").join,
//    util = require("../util.js"),
//    shortid = require("shortid"),
//    FileSystem = require("../blobStorage/fileSystem.js"),
//    MemoryStream = require('memorystream'),
//    Readable = require("stream").Readable;

//describe('fileSystem', function () {
    
//    beforeEach(function () {
//        this.blobStorage = new FileSystem({ root: "test-output" });
//    });

//    afterEach(function () {
//        util.deleteFiles("test-output");
//    });

//    it('should be able to write from string stream', function (done) {
//        var self = this;
        
//        var ms = new Readable();
//        ms.push("Hey");
//        ms.push(null);
        
//        self.blobStorage.write(shortid.generate(), ms, function (err, blobName) {
//            assert.ifError(err);
            
//            fs.readFile(join(self.blobStorage.options.root, blobName), function (er, content) {
//                assert.equal("Hey", content);
//                done();
//            });
//        });
//    });
    
//    it('should be able to write from file stream', function (done) {
//        var self = this;
        
//        var ms = fs.createReadStream("package.json");
       
//        self.blobStorage.write(shortid.generate(), ms, function (err, blobName) {
//            assert.ifError(err);
            
//            fs.readFile(join(self.blobStorage.options.root, blobName), function (er, content) {
//                fs.readFile("package.json", function (errr, origContent) {
//                    assert.equal(origContent + "", content + "");
//                    done();
//                });
//            });
//        });
//    });
//});