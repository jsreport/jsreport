/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * http server cluster listening on dedicated work and executing specified tasks
 */

var cluster = require('cluster'),
    express = require('express'),
    _ = require("underscore"),
    path = require("path"),
    bodyParser = require("body-parser");

var workers = [];
var port;

if (cluster.isMaster) {
    cluster.on("fork", function (worker) {
        worker.pid = worker.process.pid;
        worker.isRunning = false;
        workers.push(worker);

        worker.process.on("message", function (m) {
            if (m.action === "register") {
                var worker = _.findWhere(workers, { pid: m.pid });
                worker.rid = m.rid;
                process.send({
                    action: "register",
                    rid: m.rid
                });
            }
        });

        worker.on('exit', function (w, code, signal) {
            workers = _.without(workers, _.findWhere(workers, { pid: worker.pid}));
            cluster.fork();
        });

        worker.send({
            action: "start",
            port: port
        });
    });

    cluster.on("listening", function (worker) {
        worker.isRunning = true;

        if (!_.findWhere(workers, { isRunning: false })) {
            process.send({
                action: "running"
            });
        }
    });

    process.on("message", function (m) {
        if (m.action === "kill") {
            var worker = _.findWhere(workers, { rid: m.rid });
            if (worker)
                worker.process.kill("SIGKILL");
        }

        if (m.action === "start") {
            port = m.port;
            for (var i = 0; i < m.numberOfWorkers; i++) {
                cluster.fork();
            }
        }
    });
}


if (!cluster.isMaster) {

    var startListening = function(port) {

        var express = require('express');
        var app = express();

        var server = require('http').createServer(app);

        app.use(bodyParser.json({
            limit: "20mb"
        }));

        app.use(function(req, res, next) {

            var d = require('domain').create();

            d.on('error', function (er) {
                try {

                    // make sure we close down within 30 seconds
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
                    if (cluster) {
                        cluster.worker.disconnect();
                    }

                    res.send({
                        error: {
                            message: er.message,
                            stack: er.stack
                        }
                    });
                } catch (er2) {
                    // oh well, not much we can do at this point.
                    console.error('Error sending 500!', er2.stack);
                }
            });

            d.add(req);
            d.add(res);
            d.req = req;

            d.run(function () {
                next();
            });
        });

        app.post('/', function (req, res, next) {
            process.send({ action: "register", rid: req.body.rid, pid: process.pid});

            try {
                require(req.body.execModulePath)(req, res, next);
            }
            catch (e) {
                next(e);
            }
        });

        app.use(function (err, req, res, next) {
            res.send({
                error: {
                    message: err.message,
                    stack: err.stack
                }
            });
        });

        server.listen(port);
    };

    process.on("message", function (m) {
        if (m.action === "start") {
            startListening(m.port);
        }
    });
}


