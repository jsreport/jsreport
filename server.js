var express = require('express'),
    _ = require("underscore"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    path = require("path"),
    connect = require("connect"),
    config = require("./config.js");


process.on('uncaughtException', function(err) {
    console.error(err);
    console.log("Node NOT Exiting...");
});

var app = module.exports = express();
app.use(connect.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'views')));
app.engine('html', require('ejs').renderFile);
app.use(express.cookieParser());
app.use(express.cookieSession(config.cookieSession));
    
/* LOGGING */
var transportSettings = {
    timestamp: true,
    colorize: true,
    level: "debug"
};

var consoleTransport = new (winston.transports.Console)(transportSettings);
var fileTransport = new (winston.transports.File)({ name: "main", filename: 'reporter.log', maxsize: 10485760, json: false });
var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: 'error.log', handleExceptions: true,json: false });

winston.loggers.add('jsreport', {
    transports: [ consoleTransport, fileTransport, errorFileTransport ]
});

var logger = winston.loggers.add('jsreport.templates', {
    transports: [
        consoleTransport,
        fileTransport,
        new (winston.transports.File)({ name: "templates", filename: 'templates.log', maxsize: 10485760, json: false }),
        errorFileTransport
    ]
});

require("./reporter.install.js")(app, {
    mode: config.mode,
    connectionString: config.connectionString,
    extensions: config.extensions
}, function() {
    app.listen(config.port);    
});

