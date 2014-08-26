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
        app.use(bodyParser.json({
            limit: "2mb"
        }));

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

        app.listen(port);
    }

    process.on("message", function (m) {
        if (m.action === "start") {
            startListening(m.port);
        }
    });
}


