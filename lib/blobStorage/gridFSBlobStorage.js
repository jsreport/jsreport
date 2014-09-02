/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Big binary file storage in mongo
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

var GridFSBlobStorage = module.exports = function(connectionString) {
    if (!connectionString){
        throw new Error("connectionString must be provided when using gridFS blob storage.")
    }

    if (connectionString.name != "mongoDB"){
        throw new Error("connectionString.name must be mongoDB when using gridFS blob storage");
    }

    if (!dbs[connectionString.databaseName])
        dbs[connectionString.databaseName] = new Db(connectionString.databaseName, new Server(connectionString.address, connectionString.port), { safe: true });

    this._db = dbs[connectionString.databaseName];
};

GridFSBlobStorage.prototype._open = function(db, cb) {
    if (db.isOpen)
        return cb(null, db);

    db.open(function(err, db) {
        db.isOpen = true;
        cb(err, db);
    });
};

GridFSBlobStorage.prototype.write = function(blobName, inputStream, cb) {
    this._open(this._db, function(err, db) {
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

GridFSBlobStorage.prototype.read = function(blobName, cb) {
    this._open(this._db, function(err, db) {
        var gs = new mongodb.GridStore(db, blobName, "r", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            cb(null, gs.stream(true));
        });
    });
};