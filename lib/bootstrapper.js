/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * bootstrapper Reporter instance
 * responsible for initializing loggers, parsing config files and clustering
 */

var path = require("path"),
    _ = require("underscore"),
    extend = require("node.extend"),
    winston = require("winston"),
    connect = require("connect"),
    cluster = require('cluster'),
    http = require('http'),
    https = require('https'),
    fs = require("fs"),
    q = require("q"),
    Reporter = require("./reporter.js"),
    commander = require("./reportingCommander.js"),
    nconf = require('nconf'),
    numCPUs = require('os').cpus().length,
    validateConfiguration = require("./configuration/validate.js");

/**
 * Load config from [prod|dev|test].config.json file depending on NODE_ENV and returns instance of {Bootstrapper}
 * If the config file is not found, it tries created based on example.config.json
 * @returns {Bootstrapper}
 */
module.exports = function (options) {
    options = options || {};

    options.rootDirectory = options.rootDirectory || path.join(__dirname, "../../../");
    options.dataDirectory = options.dataDirectory || path.join(options.rootDirectory, "data");
    options.tempDirectory = options.tempDirectory || path.join(options.dataDirectory, "temp");

    if (!fs.existsSync(options.dataDirectory)) {
        fs.mkdir(options.dataDirectory);
    }

    if (!fs.existsSync(options.tempDirectory)) {
        fs.mkdir(options.tempDirectory);
    }

    process.env.NODE_ENV = process.env.NODE_ENV || 'production';

    function getConfigFile() {
        if (process.env.NODE_ENV === "production")
            return "prod.config.json";

        if (process.env.NODE_ENV === "test")
            return "test.config.json";

        return "dev.config.json";
    }

    var pathToConfig = path.join(options.rootDirectory, getConfigFile());

    if (!fs.existsSync(pathToConfig)) {
        var pathToExampleConfig = options.pathToExampleConfig || "example.config.json";

        if (fs.existsSync(path.join(options.rootDirectory, pathToExampleConfig))) {
            fs.writeFileSync(getConfigFile(), fs.readFileSync(path.join(options.rootDirectory, pathToExampleConfig)));
        }
    }

    options.extensionsManager = options.extensionsManager || {
        supportsUnregistration: true
    };

    var nfn = nconf.argv().env().defaults(options);

    if (fs.existsSync(path.join(options.rootDirectory, getConfigFile())))
        nfn.file({ file: path.join(options.rootDirectory, getConfigFile()) });

    q.longStackSupport = true;

    return new Bootstrapper();
};

var Bootstrapper = function () {
    this._createReporterFn = Bootstrapper.prototype._createReporter.bind(this);
    this._createLoggerFn = Bootstrapper.prototype._createLogger.bind(this);
};

/**
 * Bootstraps from merged configuration and initializes Reporter instance.
 * @returns {*} Q promise
 */
Bootstrapper.prototype.start = function () {

    var self = this;

    return q().then(function () {
        if (!fs.existsSync(path.join(nconf.get("rootDirectory"), "data"))) {
            fs.mkdir(path.join(nconf.get("rootDirectory"), "data"));
        }

        //apply command line arguments
        commander();

        self.config = nconf.get();
        validateConfiguration(self.config);

        if (self.config.cluster && (self.config.cluster.enabled || self.config.cluster.enabled === undefined)) {
            return self._startInCluster();
        }

        return self._startServer();
    }).fail(function (e) {
        console.error("error when bootstrapping jsreport");
        console.error(e.stack);
        return q.reject(e);
    });
};

/**
 * Possible override for initializing reporter.js (used by jsreport online)
 * @param fn this points to current Bootstrapper instance
 * @returns {Bootstrapper}
 */
Bootstrapper.prototype.createReporter = function (fn) {
    this._createReporterFn = fn.bind(this);
    return this;
};

/**
 * Possible override for creating logger. Should return instance of object having info, debug, warn and error methods.
 * @param fn this points to current Bootstrapper instance
 * @returns {Bootstrapper}
 */
Bootstrapper.prototype.createLogger = function (fn) {
    this._createLoggerFn = fn.bind(this);
    return this;
};


Bootstrapper.prototype._startServer = function (cluster) {
    var self = this;

    return q().then(function () {
        self.logger = self._createLoggerFn(this);
    }).then(function () {
        return q(self._createReporterFn(self)).then(function (reporter) {
            self.reporter = reporter;
        });
    }).then(function () {
        if (self.config.httpsPort)
            self.logger.info("jsreport server successfully started on https port: " + self.config.httpsPort);

        if (self.config.httpPort)
            self.logger.info("jsreport server successfully started on http port: " + self.config.httpPort);

        return self;
    });
};

Bootstrapper.prototype._createLogger = function () {
    if (!winston.loggers.has("jsreport")) {
        var transportSettings = {
            timestamp: true,
            colorize: true,
            level: process.env.NODE_ENV === "production" ? "info" : "debug"
        };

        var logDirectory = this.config.logDirectory || path.join(this.config.rootDirectory, "logs");

        if (!fs.existsSync(logDirectory)) {
            fs.mkdir(logDirectory);
        }

        var consoleTransport = new (winston.transports.Console)(transportSettings);
        var fileTransport = new (winston.transports.File)({ name: "main", filename: path.join(logDirectory, 'reporter.log'), maxsize: 10485760, json: false, level: transportSettings.level });
        var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: path.join(logDirectory, 'error.log'), handleExceptions: true, json: false });

        winston.loggers.add('jsreport', {
            transports: [consoleTransport, fileTransport, errorFileTransport]
        });
    }

    return winston.loggers.get("jsreport");
};

Bootstrapper.prototype._createReporter = function () {
    var self = this;

    this.config.logger = winston.loggers.get("jsreport");
    this.config.taskManager = this.taskManager;
    this.reporter = new Reporter(this.config);

    return this.reporter.init();
};

Bootstrapper.prototype._startInCluster = function () {
    var self = this;

    self.config._cluster = cluster;
    if (self.config._cluster.isMaster) {

        var numberOfWorkers = self.config.cluster.numberOfWorkers || numCPUs;
        for (var i = 0; i < numberOfWorkers; i++) {
            winston.loggers.get("jsreport").info("forking jsreport server into cluster");
            self.config._cluster.fork();
        }

        self.config._cluster.on('disconnect', function (worker) {
            winston.loggers.get("jsreport").warn("jsreport cluster worker unexpectly disconnected. Forking new.");
            self.config._cluster.fork();
        });

        if (self.config.daemon) {
            require('daemon')();
        }

        return q();
    }

    return self._startServer();
}