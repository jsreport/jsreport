var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    winston = require("winston"),
    mongodb = require("mongodb");

var logger = winston.loggers.get('jsreport');

function GridFS(db) {
    this._db = db;
};

GridFS.prototype.write = function (blobName, inputStream, cb) {
    var gs = new mongodb.GridStore(this._db, blobName, "w", { "chunk_size": 1024*4});
    gs.open(function() {
        gs.write(inputStream, function(err, gs) {
            gs.close(function() {
                cb(null, blobName);
            });
        });
    });
};

GridFS.prototype.read  = function (blobName, cb) {
    var gs = new mongodb.GridStore(this._db, blobName, "r", { "chunk_size": 1024*4});
    gs.open(function(err, gs) {
        cb(null, gs.stream(true));
    });
};

module.exports = GridFS;