/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    winston = require("winston");

var logger = winston.loggers.get('jsreport');

function FileSystem(options) {
    this.options = options || {};

    this.options.root = this.options.root || "storage";
};

FileSystem.prototype.write = function (blobName, buffer, cb) {
    blobName = blobName + "";
   
   
    var blobPath = path.join(this.options.root, blobName);
    
    fs.writeFile(blobPath, buffer, function(err) {
        if (err)
            return cb(err);

        cb(null, blobName);
    });
};

FileSystem.prototype.read  = function (blobName, cb) {
    blobName = blobName + "";
    
    cb(null, fs.createReadStream(path.join(this.options.root, blobName)));
};


module.exports = FileSystem;