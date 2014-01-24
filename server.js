var express = require('express'),
    _ = require("underscore"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    install = require("./reporter.install.js"),
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
app.use(express.cookieSession(config.cookie));
    
/* LOGGING */
var transportSettings = {
    timestamp: true,
    colorize: true,
    level: "debug"
};

winston.remove(winston.transports.Console).add(winston.transports.Console, transportSettings);
var logger = winston.loggers.add('jsreport');
logger.remove(winston.transports.Console).add(winston.transports.Console, transportSettings);
logger.add(winston.transports.File, { filename: 'reporter.log' });
/*  --- */

install(app, {
    mode: config.mode,
    connectionString: config.connectionString,
    extensions: config.extensions
});

app.listen(config.port);