/*! 
 * Copyright(c) 2014 Jan Blaha 
 *  
 */


var fs = require("fs"),
    path = require("path"),
    S = require("string"),
    _ = require("underscore"),
    q = require("q"),
    net = require('net');

/**
 * Recursively deletes files in folder
 */
var deleteFiles = exports.deleteFiles = function (path) {
    try {
        var files = fs.readdirSync(path);

        if (files.length > 0)
            for (var i = 0; i < files.length; i++) {
                var filePath = path + '/' + files[i];
                if (fs.statSync(filePath).isFile())
                    fs.unlinkSync(filePath);
                else
                    deleteFiles(filePath);
            }
        fs.rmdirSync(path);
    }
    catch (e) {
        return;
    }
};

/**
 * Searchesss for the particular file names in the directory
 */
var walk = exports.walk = function (rootPath, fileName, done) {
    var results = [];
    fs.readdir(rootPath, function (err, list) {
        if (err) return done(err);

        var pending = list.length;
        if (!pending) return done(null, results);

        list.forEach(function (file) {
            file = path.join(rootPath, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    //ignore cycles in ..jsreport\node_modules\jsreport-import-export\node_modules\jsreport
                    if (S(rootPath).contains("node_modules") && S(file).endsWith("node_modules")) {
                        if (!--pending) done(null, results);
                    } else {
                        walk(file, fileName, function (err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    }
                } else {
                    if (S(file).contains(fileName))
                        results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

/**
 * Sync search for the particular files in the directory
 */
var walkSync = exports.walkSync = function (rootPath, fileName, results) {
    var list = fs.readdirSync(rootPath);

    list.forEach(function (file) {
        file = path.join(rootPath, file);
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            //ignore cycles in ..jsreport\node_modules\jsreport-import-export\node_modules\jsreport
            if (!(S(rootPath).contains("node_modules") && S(file).endsWith("node_modules"))) {
                walkSync(file, fileName, results);
            }
        } else {
            if (S(file).contains(fileName))
                results.push(file);
        }
    });

    return results;
};