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

var deleteFiles = exports.deleteFiles = function (path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFiles(curPath);
            }
            else { // delete file
                fs.unlinkSync(curPath);
            }
        });
    }
};

exports.attachLogToListener = function (listener, listenerName, logger) {
    listener.pre(function () {
        if (logger) logger.debug("Start of " + listenerName + " - " + this.key);
    });
    listener.post(function () {
        if (logger) logger.debug("End of " + listenerName + " - " + this.key);
    });
    listener.postFail(function (err) {
        if (logger) {
            var logFn = err.weak ? logger.warn : logger.error;
            logFn("Error in " + listenerName + " - " + this.key + "/ Error - " + err);
        }
    });

    return listener;
};

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

var findFreePort = exports.findFreePort = function () {

    return q.nfcall(function(cb) {
        var server = require("net-cluster").createServer();
        var port = 0;
        server.on('listening', function () {
            port = server.address().port;
            server.close();
        });
        server.on('close', function () {
            cb(null, port);
        });
        server.listen(0);
    });
}