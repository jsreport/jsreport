/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * TaskManager responsible for running async tasks.
 * It's using cluster on http server to load balance work and also provides
 * timout handling
 */

var childProcess = require("child_process"),
    path = require("path"),
    q = require("q"),
    uuid = require("uuid").v1,
    request = require("request"),
    _ = require("underscore"),
    findFreePort = require("../util/util.js").findFreePort,
    numCPUs = require('os').cpus().length,
    S = require("string");

var TaskManager = module.exports = function (options) {
    this.options = options || {};
    this.options.numberOfWorkers = this.options.numberOfWorkers || numCPUs;
    this.options.timeout = this.options.timeout || 10000;
    this._runningRequests = [];

    var self = this;
    process.once("exit", function() {
        self.kill();
    });
};

TaskManager.prototype.start = function () {
    var deferred = q.defer();
    var self = this;

    return findFreePort().then(function (port) {
        self.options.port = port;

        //fix freeze during debugging
        process.execArgv = _.filter(process.execArgv, function(arg) { return !S(arg).startsWith("--debug");});

        self.workersCluster = childProcess.fork(path.join(__dirname, "workersCluster.js"), []);
        self.workersCluster.on("message", function (m) {
            if (m.action === "running") {
                self.isStarted = true;
                deferred.resolve();
            }
        });

        self.workersCluster.on("message", function (m) {
            if (m.action === "register") {

                var reqOptions = _.findWhere(self._runningRequests, { rid: m.rid});

                if (!reqOptions)
                    return;

                //TODO we should actually kill only the script that caused timeout and resend other requests from the same worker... some more complicated logic is required here
                setTimeout(function () {
                    if (reqOptions.isDone)
                        return;

                    reqOptions.isDone = true;
                    self.workersCluster.send({ action: "kill", rid: reqOptions.rid});

                    var error = new Error();
                    error.weak = true;
                    error.message = "Timeout";

                    self._runningRequests = _.without(self._runningRequests, _.findWhere(self._runningRequests, {rid: reqOptions.rid}));

                    reqOptions.deferred.reject(error);
                }, reqOptions.timeout || self.options.timeout);
            }
        });

        self.workersCluster.send({
            action: "start",
            port: self.options.port,
            numberOfWorkers: self.options.numberOfWorkers
        });
    }).then(function () {
        return deferred.promise;
    });
};

TaskManager.prototype.ensureStarted = function () {
    if (this.isStarted)
        return q();

    return this.start();
};


TaskManager.prototype.execute = function (options) {
    var self = this;

    options.rid = options.body.rid = uuid();
    options.body.execModulePath = options.execModulePath;
    options.isDone = false;
    options.deferred = q.defer();

    this._runningRequests.push(options);

    request({
        method: "POST",
        url: "http://localhost:" + this.options.port,
        body: options.body,
        json: true
    }, function (err, httpResponse, body) {
        if (options.isDone)
            return;

        options.isDone = true;

        self._runningRequests = _.without(self._runningRequests, _.findWhere(self._runningRequests, {rid: options.rid}));

        if (err) {
            return options.deferred.reject(err);
        }

        if (body.error) {
            var e = new Error();
            e.message = body.error.message;
            e.stack = body.error.stack;
            e.weak = true;
            return options.deferred.reject(e);
        }

        options.deferred.resolve(body);
    });

    return options.deferred.promise;
};

TaskManager.prototype.kill = function () {
    if (this.workersCluster) {
        this.workersCluster.kill();
    }
};
