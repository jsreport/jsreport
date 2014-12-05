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
            '--ssl-protocol=any',
            path.join(__dirname, 'bridge.js')
        ];

        var defer = q.defer();

        self._childProcess = childProcess.execFile(phantomjs.path, childArgs, function (error, stdout, stderr) {
        });

        //we need to wait a little bit until phantomjs server is started
        setTimeout(function() {
            defer.resolve();
        }, 100);

        self._childProcess.stdout.pipe(process.stdout);
        self._childProcess.stderr.pipe(process.stderr);
        self._childProcess.stdin.write(port + "\n");

        return defer.promise;
    });
};

PhantomWorker.prototype.recycle = function () {
    var self = this;
    self._childProcess.kill();
    return self.start();
};

PhantomWorker.prototype.kill = function () {
    this._childProcess.kill("SIGTERM");
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
        var numberOfPages = "";
        res.on("data", function(chunk) {
            numberOfPages += chunk;
        });
        res.on("end", function() {
            self.isBusy = false;
            deferred.resolve(numberOfPages);
        });
    });

    req.setHeader('Content-Type', 'application/json');
    var json = JSON.stringify(options);
    req.setHeader('Content-Length', Buffer.byteLength(json));
    req.write(json);

    req.on("error", function (e) {
        self.isBusy = false;
    });

    req.end();

    return deferred.promise;
};

var PhantomManager = module.exports = function (options) {
    this._phantomInstances = [];
    this.options = options || {};
    this.options.numberOfWorkers = this.options.numberOfWorkers || numCPUs;
    this.options.timeout = this.options.timeout || 180000;
    this.tasksQueue = [];
};

PhantomManager.prototype.start = function () {
    var startPromises = [];
    for (var i = 0; i < this.options.numberOfWorkers; i++) {
        this._phantomInstances.push(new PhantomWorker());
        startPromises.push(this._phantomInstances[i].start());
    }

    var self = this;

    process.once("exit", function () {
        self._phantomInstances.forEach(function(i) {
            i.kill();
        });
    });

    return q.all(startPromises);
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

    worker.execute(options).then(function (numberOfPages) {
        isDone = true;
        self.tryFlushQueue();
        deferred.resolve(numberOfPages);
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

    this._executeInWorker(freePhantomInstance, task.options).then(function (numberOfPages) {
        task.deferred.resolve(numberOfPages);
    });
};




