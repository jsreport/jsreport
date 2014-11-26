/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Big binary file storage in mongo
 */ 

var util = require("util"),
    fs = require("fs"),
    path = require("path"),
    mongodb = require("mongodb"),
    mongoConnectionProvider = require("../jaydata/mongoConnectionProvider.js");

var GridFSBlobStorage = module.exports = function(connectionString) {

    if (!connectionString){
        throw new Error("connectionString must be provided when using gridFS blob storage.");
    }

    if (connectionString.name.toString() !== "mongoDB"){
        throw new Error("connectionString.name must be mongoDB when using gridFS blob storage");
    }

    this.connectionProvider = mongoConnectionProvider(connectionString);
};

GridFSBlobStorage.prototype.write = function(blobName, inputStream, cb) {
    this.connectionProvider(function(err, db) {
        if (err) {
            return cb(err);
        }

        var gs = new mongodb.GridStore(db, blobName, "w", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            gs.write(inputStream, function(err, gs) {
                gs.close(function() {
                    cb(err, blobName);
                });
            });
        });
    });
};

GridFSBlobStorage.prototype.read = function(blobName, cb) {
    this.connectionProvider(function(err, db) {
        if (err) {
            return cb(err);
        }

        var gs = new mongodb.GridStore(db, blobName, "r", { "chunk_size": 1024 * 4 });
        gs.open(function() {
            try {
                cb(null, gs.stream(true));
            }
            catch(e) {
                cb(e);
            }
        });
    });
};