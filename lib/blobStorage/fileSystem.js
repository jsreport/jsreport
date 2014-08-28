/*! 
 * Copyright(c) 2014 Jan Blaha 
 * FileSystem - big binary file storage in file system
 */ 

var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    winston = require("winston");

var logger = winston.loggers.get('jsreport');

var FileSystem = module.exports = function(options) {
    this.storageDirectory = path.join(options.dataDirectory, "storage");
    
    if (!fs.existsSync(this.storageDirectory)) {
        fs.mkdir(this.storageDirectory);
    }
};

FileSystem.prototype.write = function (blobName, buffer, cb) {
    blobName = blobName + "";
   
   
    var blobPath = path.join(this.storageDirectory, blobName);
    
    fs.writeFile(blobPath, buffer, function(err) {
        if (err)
            return cb(err);

        cb(null, blobName);
    });
};

FileSystem.prototype.read  = function (blobName, cb) {
    blobName = blobName + "";
    
    cb(null, fs.createReadStream(path.join(this.storageDirectory, blobName)));
};

module.exports = FileSystem;