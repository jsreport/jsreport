/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Easy to install wrapper for Reporter and express.
 */

var path = require("path"),
    express = require('' + 'express'),
    _ = require("underscore"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    connect = require("connect"),
    http = require('http'),
    https = require('https'),
    join = require("path").join,
    fs = require("fs"),
    Q = require("q"),
    installer = require("./reporter.install.js");

function ReportingServer(config) {
    this.config = config || require("./config.js");

    if (this.config == null)
        throw new Error("Configuration for ReportingServer must be specified as a parameter or in config.js file in the root folder");
};

ReportingServer.prototype.start = function() {
    if (this.config.useCluster) {
        var cluster = require('cluster');
        if (cluster.isMaster) {
            cluster.fork();

            cluster.on('disconnect', function(worker) {
                console.error('disconnect!');
                cluster.fork();
            });
        } else {
            this._startServer();
        }
    } else {
        this._startServer();
    }
};

function domainClusterMiddleware(req, res, next) {
    var d = require('domain').create();
    d.on('error', function(er) {
        console.error('error!!', er.stack);

        try {
            // make sure we close down within 30 seconds
            var killtimer = setTimeout(function() {
                process.exit(1);
            }, 30000);
            // But don't keep the process open just for that!
            killtimer.unref();

            // stop taking new requests.
            server.close();

            // Let the master know we're dead.  This will trigger a
            // 'disconnect' in the cluster master, and then it will fork
            // a new worker.
            cluster.worker.disconnect();

            // try to send an error to the request that triggered the problem
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain');
            res.end('Oops, there was a problem!\n');
        } catch(er2) {
            // oh well, not much we can do at this point.
            console.error('Error sending 500!', er2.stack);
        }
    });

    d.add(req);
    d.add(res);

    d.run(function() {
        next();
    });
};

ReportingServer.prototype._startServer = function() {

    var app = module.exports = express();

    if (this.config.useCluster) {
        app.use(domainClusterMiddleware);
    }

    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.cookieSession(this.config.cookieSession));

/* LOGGING */
    var transportSettings = {
        timestamp: true,
        colorize: true,
        level: "debug"
    };

    if (!fs.existsSync(join(__dirname, "logs"))) {
        fs.mkdir(join(__dirname, "logs"));
    }

    var consoleTransport = new (winston.transports.Console)(transportSettings);
    var fileTransport = new (winston.transports.File)({ name: "main", filename: 'logs/reporter.log', maxsize: 10485760, json: false, level: "debug" });
    var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: 'logs/error.log', handleExceptions: true, json: false });

    winston.loggers.add('jsreport', {
        transports: [consoleTransport, fileTransport, errorFileTransport]
    });

    winston.loggers.add('jsreport.templates', {
        transports: [
            consoleTransport,
            fileTransport,
            new (winston.transports.File)({ name: "templates", filename: 'logs/templates.log', maxsize: 10485760, json: false }),
            errorFileTransport
        ]
    });

    //app.use(expressWinston.logger({
    //    transports: [consoleTransport, fileTransport, errorFileTransport]
    //}));

    var self = this;
    installer(app, this.config, function() {

        if (self.config.iisnode) {
            app.listen(self.config.port);
            return;
        }

        var credentials = {
            key: fs.readFileSync(self.config.certificate.key, 'utf8'),
            cert: fs.readFileSync(self.config.certificate.cert, 'utf8'),
            rejectUnauthorized: false
        };

        http.createServer(function(req, res) {
            res.writeHead(302, {
                'Location': "https://" + req.headers.host + req.url
            });
            res.end();
        }).listen(self.config.httpPort);

        var httpsServer = https.createServer(credentials, app);
        httpsServer.listen(self.config.port);
    });
};


module.exports = ReportingServer;