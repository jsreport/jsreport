/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * Rendering wrapper that is starting actual rendering safely in child process.
 */ 

var fork = require('child_process').fork,
    shortid = require("shortid"),
    join = require("path").join,
    winston = require("winston"),
    fs = require("fs"),
    util = require("../util/util.js"),
    _ = require("underscore"),
    async = require("async");

module.exports = function (request, response, cb) {
    async.waterfall([
            function (callback) {
                _prepareTemplate(request, callback);
            },
            function (req, callback) {
                _renderHtml(req, response, callback);
            }
    ], cb);
};

var _prepareTemplate = function (request, cb) {
    if (!request.template)
        return cb("template must be defined");

    if (!request.template.content)
        return cb("html must be defined");

    request.template.helpers = request.template.helpers || "{}";
    request.template.engine = request.template.engine || "handlebars";

    cb(null, request);
};

var _renderHtml = function (request, response, cb) {
    //response.result = "foo";
    //return cb(null, response);

    var isDone = false;

    request.data = request.data || {};

    var executorPath = join(__dirname, "renderExecution.js");
    var child = fork(executorPath);
    
    child.on('message', function (m) {
        isDone = true;

        if (m.error) {
            var e = new Error();
            e.message = m.error;
            e.stack = m.errorStack;
            return cb(e);
        }
        
        response.result = m.content;
        
        return cb(null, response);
    });
    
    child.send({
        template: request.template.initData || request.template,
        data: request.data
    });

    setTimeout(function () {
        if (isDone)
            return;

       child.kill();

       cb("Timeout error during rendering");
    }, request.options.timeout);
};

