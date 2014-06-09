/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * expressjs server wrapping Reporter.
 */

var path = require("path"),
    express = require('express'),
    _ = require("underscore"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    connect = require("connect"),
    http = require('http'),
    https = require('https'),
    join = require("path").join,
    fs = require("fs"),
    Q = require("q"),
    Reporter = require("./reporter.js"),
    commander = require("./reportingCommander.js"),
    nconf = require('nconf');


/**
 * Create reporting server based on configuration
 * @param {object} config see config.json
 */

var ReportingServer = function () {

    process.env.NODE_ENV = process.env.NODE_ENV || 'production';

    function getConfigFile() {
        if (process.env.NODE_ENV === "production")
            return "prod.config.json";

        return "dev.config.json";
    }

    if (!fs.existsSync(getConfigFile())) {
        fs.writeFileSync(getConfigFile(), fs.readFileSync("example.config.json"));
    }

    //  load configuration
    nconf
        .argv()                     //  argv is fourth
        .env()                      //  env is third
        .file({ file: getConfigFile() }) //  file is second
        .defaults({                 //  defaults are first
            port: 3000,
            httpPort: 3080,
            httpsOnly: true
        });
    Q.longStackSupport = true;
};


/**
 * Start server and listen on the port specifiied in config
 */
ReportingServer.prototype.start = function (callback) {
    var me = this;
    //apply command line arguments and update config
    commander(function (err, success) {
        if (success) {
            if (nconf.get('useCluster')) {
                var cluster = require('cluster');
                if (cluster.isMaster) {
                    cluster.fork();

                    cluster.on('disconnect', function (worker) {
                        console.error('disconnect!');
                        cluster.fork();
                    });

                    if (nconf.get('daemon')) {
                        require('daemon')();
                    }
                } else {
                    me._startServer();
                }
            } else {
                me._startServer();
            }
        } else {
            callback(err);
        }
    });
};

/**
 * Global error handling using cluster and nodejs domains.
 */

function domainClusterMiddleware(req, res, next) {
    var d = require('domain').create();
    d.on('error', function (er) {
        console.error('error!!', er.stack);

        try {
            // make sure we close down within 30 seconds
            var killtimer = setTimeout(function () {
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
        } catch (er2) {
            // oh well, not much we can do at this point.
            console.error('Error sending 500!', er2.stack);
        }
    });

    d.add(req);
    d.add(res);

    d.run(function () {
        next();
    });
}

ReportingServer.prototype._initReporter = function (app, cb) {
    nconf.load(function (err, config) {
        config.express = { app: app };
        (new Reporter(config)).init().then(cb);
    })
};

ReportingServer.prototype._startServer = function () {

    var app = express();

    if (nconf.get('useCluster')) {
        app.use(domainClusterMiddleware);
    }

    app.use(require("body-parser")({
        limit: 2 * 1024 * 1024 * 1//2MB
    }));
    app.use(require("method-override")());
    app.use(require("connect-multiparty")());

    if (!winston.loggers.has("jsreport")) {
        var transportSettings = {
            timestamp: true,
            colorize: true,
            level: "debug"
        };

        if (!fs.existsSync("logs")) {
            fs.mkdir("logs");
        }

        var consoleTransport = new (winston.transports.Console)(transportSettings);
        var fileTransport = new (winston.transports.File)({ name: "main", filename: 'logs/reporter.log', maxsize: 10485760, json: false, level: "debug" });
        var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: 'logs/error.log', handleExceptions: true, json: false });

        winston.loggers.add('jsreport', {
            transports: [consoleTransport, fileTransport, errorFileTransport]
        });
    }

    var self = this;
    this._initReporter(app, function () {

        if (nconf.get('iisnode')) {
            app.listen(nconf.get('port'));
            return;
        }

        if (!fs.existsSync(nconf.get('certificate:key'))) {
            nconf.set('certificate:key', path.join(__dirname, "certificates", "jsreport.net.key"));
            nconf.set('certificate:cert', path.join(__dirname, "certificates", "jsreport.net.cert"));
        }

        var credentials = {
            key: fs.readFileSync(nconf.get('certificate:key'), 'utf8'),
            cert: fs.readFileSync(nconf.get('certificate:cert'), 'utf8'),
            rejectUnauthorized: false //support invalid certificates
        };

        if (nconf.get('httpsOnly')) {    //  create redirector
            http.createServer(function (req, res) {
                res.writeHead(302, {
                    'Location': "https://" + req.headers.host.split(':')[0] + ':' + nconf.get('port') + req.url     //  TODO: Recheck
                });
                res.end();
            }).listen(nconf.get('httpPort'));
        } else {                          //  create http server
            http.createServer(app).listen(nconf.get('httpPort'));
        }

        https.createServer(credentials, app).listen(nconf.get('port'));
    });
};

module.exports = ReportingServer;
