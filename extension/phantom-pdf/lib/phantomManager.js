/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * PhantomManager is responsible of managing pool of phantomjs worker processes
 * and distributing pdf rendering tasks to them.
 */

var childProcess = require('child_process'),
    uuid = require("uuid").v1,
    phantomjs = require("phantomjs"),
    path = require("path"),
    q = require("q"),
    net = require("net"),
    request = require('request'),
    _ = require("underscore"),
    numCPUs = require('os').cpus().length;

var PhantomManager = module.exports = function (options) {
    this._phantomInstances = [];
    this.options = options || {};
    this.options.numberOfWorkers = this.options.numberOfWorkers || numCPUs;
    this.options.timeout = this.options.timeout || 180000;
    this.tasksQueue = [];
};

PhantomManager.prototype.start = function () {
    for (var i = 0; i < this.options.numberOfWorkers; i++) {
        this._phantomInstances.push(new PhantomWorker());
        this._phantomInstances[i].start();
    }
};

PhantomManager.prototype.execute = function (options) {
    var self = this;

    var freePhantomInstance = _.findWhere(this._phantomInstances, {
        isBusy: false
    });

    if (freePhantomInstance) {
        return this._executeInWorker(freePhantomInstance, options);
    }

    var deferred = q.defer();
    this.tasksQueue.push({ options: options, deferred: deferred });
    return deferred.promise;
};

PhantomManager.prototype._executeInWorker = function (worker, options) {
    var self = this;
    var isDone = false;

    var deferred = q.defer();

    setTimeout(function () {
        if (isDone)
            return;

        isDone = true;

        worker.recycle().then(function () {
            var error = new Error();
            error.weak = true;
            error.message = "Timeout";
            deferred.reject(error);

            self.tryFlushQueue();
        });
    }, this.options.timeout);

    worker.execute(options).then(function () {
        isDone = true;
        self.tryFlushQueue();
        deferred.resolve();
    });

    return deferred.promise;
};

PhantomManager.prototype.tryFlushQueue = function () {
    if (this.tasksQueue.length === 0)
        return;

    var freePhantomInstance = _.findWhere(this._phantomInstances, {
        isBusy: false
    });

    if (!freePhantomInstance)
        return;

    var task = this.tasksQueue.shift();

    this._executeInWorker(freePhantomInstance, task.options).then(function () {
        task.deferred.resolve();
    });
};

var PhantomWorker = function () {
    this.isBusy = false;
};

PhantomWorker.prototype.start = function () {
    var self = this;
    return findFreePort().then(function (port) {
        self.port = port;

        var childArgs = [
            '--ignore-ssl-errors=yes',
            '--web-security=false',
            path.join(__dirname, 'bridge.js')
        ];

        self._childProcess = childProcess.execFile(phantomjs.path, childArgs, function (error, stdout, stderr) {
        });

        process.on("exit", function () {
            self._childProcess.kill();
        });

        self._childProcess.stdout.pipe(process.stdout);
        self._childProcess.stderr.pipe(process.stderr);
        self._childProcess.stdin.write(port + "\n");
    });
};

PhantomWorker.prototype.recycle = function () {
    var self = this;
    self._childProcess.kill();
    return self.start();
};

PhantomWorker.prototype.execute = function (options) {
    var self = this;
    this.isBusy = true;
    var deferred = q.defer();

    var http_opts = {
        hostname: '127.0.0.1',
        port: this.port,
        path: '/',
        method: 'POST'
    };

    var req = require('http').request(http_opts, function (res) {
        self.isBusy = false;
        deferred.resolve();
    });

    req.setHeader('Content-Type', 'application/json');
    var json = JSON.stringify(options);
    req.setHeader('Content-Length', Buffer.byteLength(json));
    req.write(json);
    req.end();

    req.on("error", function (e) {
        self.isBusy = false;
    });

    return deferred.promise;
};

var findFreePort = function () {
    return q.nfcall(function (cb) {
        var server = require("net-cluster").createServer();
        var port = 0;
        server.on('listening', function () {
            port = server.address().port;
            server.close();
        });
        server.on('close', function () {
            cb(null, port);
        });
        server.listen(0);
    });
};
