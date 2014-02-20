var childProcess = require('child_process'),
    phantomjs = require('phantomjs'),
    binPath = phantomjs.path,
    fork = require('child_process').fork,
    shortid = require("shortid"),
    join = require("path").join,
    winston = require("winston"),
    sformat = require("stringformat"),
    fs = require("fs"),
    util = require("../util.js"),
    _ = require("underscore"),
    Readable = require("stream").Readable,
    async = require("async");

var logger = winston.loggers.get('jsreport');


module.exports = function (request, response, cb) {
    logger.info("Rendering html");

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
    logger.info("Preparing template");

    if (request.template == null)
        return cb("template must be defined");

    if (request.template.content == null)
        return cb("html must be defined");

    request.template.helpers = request.template.helpers || "{}";
    request.template.engine = request.template.engine || "jsrender";

    cb(null, request);
};

var _renderHtml = function (request, response, cb) {
    //todo remove for production
    //response.result = "test";
    //return cb(null, response);



    logger.info("Executing child process for rendering html");

    var isDone = false;

    request.data = request.data || {};

    var executorPath = join(__dirname, "renderExecution.js");
    var child = fork(executorPath);
    
    child.on('message', function (m) {
        isDone = true;

        if (m.error) {
            logger.debug("Child process process resulted in error " + JSON.stringify(m.error));
            return cb({ message: m.error, stack: m.errorStack });
        }

        logger.info("Child process successfully finished.");
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
        logger.error("Child process resulted in timeout.");

        cb("Timeout error during rendering");
    }, request.options.timeout);
};

