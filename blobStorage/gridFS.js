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

var dbs = {};

function open(db, cb) {
    if (db.isOpen)
        return cb(null, db);

    db.open(function(err, db) {
        db.isOpen = true;
        cb(err, db);
    });
}

function GridFS(connectionString) {
    if (dbs[connectionString.databaseName] == null)
        dbs[connectionString.databaseName] = new Db(connectionString.databaseName, new Server(connectionString.address, connectionString.port), { safe: true });

    this._db = dbs[connectionString.databaseName];
};

GridFS.prototype.write = function(blobName, inputStream, cb) {
    open(this._db, function(err, db) {
        var gs = new mongodb.GridStore(db, blobName, "w", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            gs.write(inputStream, function(err, gs) {
                gs.close(function() {
                    cb(null, blobName);
                });
            });
        });
    });
};

GridFS.prototype.read = function(blobName, cb) {
    open(this._db, function(err, db) {
        var gs = new mongodb.GridStore(db, blobName, "r", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            cb(null, gs.stream(true));
        });
    });
};

module.exports = GridFS;