/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * bootstrapper for expressjs based reporting server
 */

var path = require("path"),
    express = require('express'),
    _ = require("underscore"),
    extend = require("node.extend"),
    winston = require("winston"),
    connect = require("connect"),
    http = require('http'),
    https = require('https'),
    fs = require("fs"),
    q = require("q"),
    Reporter = require("./reporter.js"),
    commander = require("./reportingCommander.js"),
    nconf = require('nconf');


/**+
 * Load config from [prod|dev|test].config.json file depending on NODE_ENV and returns instance of {Bootstrapper}
 * If the config file is not found, it's created based on example.config.json
 * @returns {Bootstrapper}
 */
module.exports = function (options) {
    options = options || {};

    process.env.NODE_ENV = process.env.NODE_ENV || 'production';

    function getConfigFile() {
        if (process.env.NODE_ENV === "production")
            return "prod.config.json";

        if (process.env.NODE_ENV === "test")
            return "test.config.json";

        return "dev.config.json";
    }

    if (!fs.existsSync(getConfigFile())) {
        var pathToExampleConfig = options.pathToExampleConfig || path.join(__dirname, "../", "example.config.json");
        fs.writeFileSync(getConfigFile(), fs.readFileSync(pathToExampleConfig));
    }

    //  load configuration
    nconf
        .argv()                     //  argv is fourth
        .env()                      //  env is third
        .file({ file: getConfigFile() }) //  file is second
        .defaults({                 //  defaults are first
            extensionsManager: {
                supportsUnregistration: true
            },
            rootDirectory: path.join(__dirname, "../")
        });

    q.longStackSupport = true;

    return new Bootstrapper();
};

var Bootstrapper = function () {
    this._configureFn = function () {
        return q();
    };
    this._expressFn = function () {
        return q();
    };

    this._initializeFn = Bootstrapper.prototype._initReporter.bind(this);
};

/**
 * Initialize jsreport express js server and return q promise to await it.
 * @returns {*} Q promise
 */
Bootstrapper.prototype.start = function () {

    var self = this;

    return q().then(function () {
        return self._configureFn(nconf);
    }).then(function () {

        if (!fs.existsSync(path.join(nconf.get("rootDirectory"), "data"))) {
            fs.mkdir(path.join(nconf.get("rootDirectory"), "data"));
        }

        //apply command line arguments and update config
        commander();

        if (!nconf.get('useCluster')) {
            return self._startServer();
        }

        self._cluster = require('cluster');
        if (self._cluster.isMaster) {
            self._cluster.fork();

            self._cluster.on('disconnect', function (worker) {
                console.error('disconnect!');
                self._cluster.fork();
            });

            if (nconf.get('daemon')) {
                require('daemon')();
            }

            return q();
        }

        return self._startServer();
    }).fail(function (e) {
        console.error("error when bootstrapping jsreport");
        console.error(e.stack);
        return q.reject(e);
    });
};

/**
 * Hook to modify configuration after it was loaded from config.json file
 * @param fn (nconf)
 * @returns {Bootstrapper}
 */
Bootstrapper.prototype.configure = function (fn) {
    this._configureFn = fn;
    return this;
};

/**
 * Hook to modify express js app after it was created
 * @param fn (nconf, app)
 * @returns {Bootstrapper}
 */
Bootstrapper.prototype.express = function (fn) {
    this._expressFn = fn;
    return this;
};

/**
 * Possible override for initializing reporter.js (used by jsreport online)
 * @param fn this points to current Bootstrapper instance
 * @returns {Bootstrapper}
 */
Bootstrapper.prototype.initialize = function (fn) {
    this._initializeFn = fn.bind(this);
    return this;
};


Bootstrapper.prototype._startServer = function (cluster) {
    var self = this;

    this.config = nconf.get();

    return self._initWinston().then(function () {
        return self._initExpress();
    }).then(function () {
        return self._initializeFn(self);
    }).then(function () {
        return self._initHttpServer(cluster);
    }).then(function () {
        if (self.config.httpsPort)
            winston.loggers.get("jsreport").info("jsreport server successfully started on https port: " + self.config.httpsPort);

        if (self.config.httpPort)
            winston.loggers.get("jsreport").info("jsreport server successfully started on http port: " + self.config.httpPort);
    });
};

Bootstrapper.prototype._initWinston = function () {
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

    return q();
};

Bootstrapper.prototype._initExpress = function () {
    var app = express();

    app.use(require("body-parser")({
        limit: 2 * 1024 * 1024 * 1//2MB
    }));
    app.use(require("method-override")());
    app.use(require("connect-multiparty")());

    this._app = app;
    this.config.app = app;
    return this._expressFn(nconf, app);
};

Bootstrapper.prototype._initReporter = function () {
    var self = this;

    this.config.express = { app: self._app };
    this.config.logger = winston.loggers.get("jsreport");

    return new Reporter(this.config).init();
};

Bootstrapper.prototype._initHttpServer = function () {

    if (nconf.get('httpsPort') === null && nconf.get('httpsPort') === null) {
        this._app.listen(process.env.PORT);
        return;
    }

    //just http port is specified, lets start server on http
    if (!nconf.get('httpsPort')) {
        var httpServer = http.createServer(this._app).on('error', function (e) {
            console.error("Error when starting http server on port " + nconf.get('httpPort') + " " + e.stack);
        });

        if (nconf.get('useCluster')) {
            this._addDomainCluster(this._app, httpServer, this._cluster);
        }

        return q.ninvoke(httpServer, 'listen', nconf.get('httpPort'));
    }

    //http and https port specified
    //fist start http => https redirector
    if (nconf.get('httpPort')) {

        http.createServer(function (req, res) {
            res.writeHead(302, {
                'Location': "https://" + req.headers.host.split(':')[0] + ':' + nconf.get('httpsPort') + req.url
            });
            res.end();
        }).listen(nconf.get('httpPort')).on('error', function (e) {
            console.error("Error when starting http server on port " + nconf.get('httpPort') + " " + e.stack);
        });
    }

    //second start https server
    if (!fs.existsSync(nconf.get('certificate:key'))) {
        nconf.set('certificate:key', path.join(__dirname ,"../", "certificates", "jsreport.net.key"));
        nconf.set('certificate:cert', path.join(__dirname, "../", "certificates", "jsreport.net.cert"));
    }

    var credentials = {
        key: fs.readFileSync(nconf.get('certificate:key'), 'utf8'),
        cert: fs.readFileSync(nconf.get('certificate:cert'), 'utf8'),
        rejectUnauthorized: false //support invalid certificates
    };

    var server = https.createServer(credentials, this._app).on('error', function (e) {
        console.error("Error when starting https server on port " + nconf.get('httpsPort') + " " + e.stack);
    });

    if (nconf.get('useCluster')) {
        this._addDomainCluster(this._app, server, this._cluster);
    }

    return q.ninvoke(server, 'listen', nconf.get('httpsPort'));
};

/**
 * Global error handling using cluster and nodejs domains.
 */
Bootstrapper.prototype._addDomainCluster = function (app, server, cluster) {
    app.use(function (req, res, next) {
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
    });
};