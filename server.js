var express = require('express'),
    _ = require("underscore"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    path = require("path"),
    connect = require("connect"),
    http = require('http'),
    https = require('https'),
    fs = require("fs"),
    Q = require("q"),
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
var fileTransport = new (winston.transports.File)({ name: "main", filename: 'logs/reporter.log', maxsize: 10485760, json: false, level: "debug" });
var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: 'logs/error.log', handleExceptions: true,json: false });

winston.loggers.add('jsreport', {
    transports: [ consoleTransport, fileTransport, errorFileTransport ]
});

var logger = winston.loggers.add('jsreport.templates', {
    transports: [
        consoleTransport,
        fileTransport,
        new (winston.transports.File)({ name: "templates", filename: 'logs/templates.log', maxsize: 10485760, json: false }),
        errorFileTransport
    ]
});

require("./reporter.install.js")(app, {
    mode: config.mode,
    connectionString: config.connectionString,
    extensions: config.extensions
}, function() {
    
    if (config.iisnode) {
        app.listen(config.port);
        return;
    }

    var credentials = {
        key: fs.readFileSync(config.certificate.key, 'utf8'),
        cert: fs.readFileSync(config.certificate.cert, 'utf8'),
        rejectUnauthorized: false
    };

    http.createServer(function(req, res) {
        res.writeHead(302, {
             'Location': "https://" + req.headers.host + req.url
        });
        res.end();
    }).listen(config.httpPort);

    var httpsServer = https.createServer(credentials, app);
    httpsServer.listen(config.port);    
});

