var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    winston = require("winston");

var logger = winston.loggers.get('jsreport');

function FileSystem(options) {
    this.options = options || {};

    this.options.root = this.options.root || "reports";
};

FileSystem.prototype.write = function (blobName, inputStream, cb) {
    blobName = blobName + "";
    
    var cbCalled = false;
    var blobPath = path.join(this.options.root, blobName);
    
    var wr = fs.createWriteStream(blobPath);

    wr.on("error", function (err) {
        if (!cbCalled) {
            logger.error("Error when writing file " + err);
            cb(err);
            cbCalled = true;
        }
    });

    wr.on("close", function (ex) {
        cb(null, blobName);
    });
    
    inputStream.pipe(wr);
};

FileSystem.prototype.read  = function (blobName) {
    blobName = blobName + "";
    
    return fs.createReadStream(path.join(this.options.root, blobName));
};


module.exports = FileSystem;