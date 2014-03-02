/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    winston = require("winston"),
    mongodb = require("mongodb"),
    Db = require("mongodb").Db,
    Server = require("mongodb").Server;


var logger = winston.loggers.get('jsreport');

function GridFS(connectionString) {
    this._db = new Db(connectionString.databaseName, new Server(connectionString.address, connectionString.port), { safe: true });
}

;

GridFS.prototype.write = function(blobName, inputStream, cb) {
    this._db.open(function(err, db) {
        var gs = new mongodb.GridStore(db, blobName, "w", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            gs.write(inputStream, function(err, gs) {
                gs.close(function() {
                    db.close(function() {
                        cb(null, blobName);
                    });
                });
            });
        });
    });
};

GridFS.prototype.read = function(blobName, cb) {
    this._db.open(function(err, db) {
        var gs = new mongodb.GridStore(db, blobName, "r", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            cb(null, gs.stream(true));
        });
    });

};

module.exports = GridFS;