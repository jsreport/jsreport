/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var Reporter = require("./reporter.js"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    path = require("path"),
    async = require("async"),
    _ = require("underscore"),
    express = require("express"),
    extend = require("node.extend");

module.exports = function(app, options, cb) {
    
    if (options.mode == "playground") {
        options.express = { app: app };
        options.playgroundMode = true;
        options.connectionString.databaseName = "playground";
        (new Reporter(options)).init().then(cb);
        return;
    }

    if (options.mode == "standard") {
        options.express = { app: app };
        options.playgroundMode = false;
        options.connectionString.databaseName = "standard";
        (new Reporter(options)).init().then(cb);
        return;
    }

    if (options.mode != "multitenant")
        throw new Error("Unsuported mode");

    require("./multitenancy.js")(app, options, cb);
};
    
   