/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * bootstrapper Reporter instance
 * responsible for initializing loggers, parsing config files and clustering
 */

var path = require("path"),
    _ = require("underscore"),
    winston = require("winston"),
    connect = require("connect"),
    cluster = require('cluster'),
    http = require('http'),
    mkdirp = require('mkdirp'),
    https = require('https'),
    fs = require("fs"),
    q = require("q"),
    Reporter = require("./reporter.js"),
    commander = require("./reportingCommander.js"),
    nconf = require('nconf'),
    numCPUs = require('os').cpus().length,
    Reaper = require("reap"),
    validateConfiguration = require("./configuration/validate.js");

var Bootstrapper = function (options) {
    this._createReporterFn = Bootstrapper.prototype._createReporter.bind(this);
    this._createLoggerFn = Bootstrapper.prototype._createLogger.bind(this);
    this.options = options;
};

/**
 * Bootstraps from merged configuration and initializes Reporter instance.
 * @returns {*} Q promise
 */
Bootstrapper.prototype.start = function () {

    var self = this;

    return q().then(function () {
        //apply command line arguments
        commander();

        self.config = nconf.get();

        self.config.dataDirectory = self.config.dataDirectory || path.join(self.config.rootDirectory, "data");
        self.config.tempDirectory = self.config.tempDirectory || path.join(self.config.dataDirectory, "temp");
        self.config.connectionString = self.config.connectionString || { name: "neDB"};

        validateConfiguration(self.config);

        self._startReaper();

        if (self.config.cluster && (self.config.cluster.enabled || self.config.cluster.enabled === undefined)) {
            self.config.cluster.enabled = true;
            return self._startInCluster();
        }

        return self._startServer();
    }).fail(function (e) {
        console.log("error when bootstrapping jsreport");
        console.log(e.stack);
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
        self.config.logger = self._createLoggerFn(this);
    }).then(function () {
        return q(self._createReporterFn(self)).then(function (reporter) {
            self.reporter = reporter;
        });
    }).then(function () {
        return self;
    });
};

Bootstrapper.prototype._createLogger = function () {
    this.config.logger = this.config.logger || {};
    this.config.logger.providerName = this.config.logger.providerName  || "winston";
    this.config.logger.providerName = this.config.logger.providerName.charAt(0).toUpperCase() + this.config.logger.providerName.slice(1);

    return this["_createLogger" + this.config.logger.providerName].call(this);
};

Bootstrapper.prototype._createLoggerDummy = function () {
    return new (require("./util/dummyLogger"))();
};

Bootstrapper.prototype._createLoggerConsole = function () {
    return new (require("./util/consoleLogger"))();
};

Bootstrapper.prototype._createLoggerWinston = function () {
    if (!winston.loggers.has("jsreport")) {
        var transportSettings = {
            timestamp: true,
            colorize: true,
            level: this.config.mode === "production" ? "info" : "debug"
        };

        var logDirectory = this.config.logger.logDirectory || path.join(this.config.rootDirectory, "logs");

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

    this.config.taskManager = this.taskManager;
    this.reporter = new Reporter(this.config);

    return this.reporter.init();
};

var reaperGlobalInterval;
Bootstrapper.prototype._startReaper = function() {

    var reaper = new Reaper({ threshold: 600000 /*10 minutes old files will be deleted*/ });

    if (!fs.existsSync(this.config.tempDirectory)){
        mkdirp.sync(this.config.tempDirectory);
    }

    reaper.watch(this.config.tempDirectory);

    if (reaperGlobalInterval) {
        clearInterval(reaperGlobalInterval);
    }
    setInterval(function () {
        reaper.start(function (err, files) {
            if (err)
                console.log(err);
        });
    }, 60000 /* check every minute for old files */);
};

Bootstrapper.prototype._startInCluster = function () {
    var self = this;

    self.config.cluster.instance = cluster;
    if (self.config.cluster.instance.isMaster) {

        var numberOfWorkers = self.config.cluster.numberOfWorkers || numCPUs;
        for (var i = 0; i < numberOfWorkers; i++) {
            console.log("forking jsreport server into cluster");
            self.config.cluster.instance.fork();
        }

        self.config.cluster.instance.on('disconnect', function (worker) {
            console.log("jsreport cluster worker unexpectly disconnected. Forking new.");
            self.config.cluster.instance.fork();
        });

        if (self.config.daemon) {
            require('daemon')();
        }

        return q(self);
    }

    return self._startServer();
};

/**
 * Load config from [prod|dev|test].config.json file depending on NODE_ENV and returns instance of {Bootstrapper}
 * If the config file is not found, it tries created based on example.config.json
 * @returns {Bootstrapper}
 */
module.exports = function (options) {
    options = options || {};

    var rootDirectory = options.rootDirectory || path.join(__dirname, "../../../");

    options.mode = process.env.NODE_ENV || 'production';

    function getConfigFile() {
        if (options.mode === "production")
            return "prod.config.json";

        if (options.mode === "test")
            return "test.config.json";

        return "dev.config.json";
    }

    var pathToConfig = path.join(rootDirectory, getConfigFile());

    if (!fs.existsSync(pathToConfig)) {
        var pathToExampleConfig = options.pathToExampleConfig || "example.config.json";

        if (fs.existsSync(path.join(rootDirectory, pathToExampleConfig))) {
            fs.writeFileSync(getConfigFile(), fs.readFileSync(path.join(rootDirectory, pathToExampleConfig)));
        }
    }

    options.extensionsManager = options.extensionsManager || {
        supportsUnregistration: true
    };

    var nfn = nconf.argv().env().defaults(options);

    if (fs.existsSync(path.join(rootDirectory, getConfigFile())))
        nfn = nfn.file({ file: path.join(rootDirectory, getConfigFile()) });

    if (!nfn.get("rootDirectory"))
        nfn.set("rootDirectory", rootDirectory);

    q.longStackSupport = true;

    return new Bootstrapper(options);
};
