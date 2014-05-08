/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var async = require("async"),
    express = require('express'),
    _ = require("underscore"),
    path = require("path"),
    dir = require("node-dir"),
    Reporter = require("../../../reporter.js"),
    odata_server = require('odata-server'),
    FS = require("q-io/fs"),
    Q = require("q"),
    serveStatic = require('serve-static');


module.exports = function(reporter, definition) {
    var app = definition.options.app;

    app.set('views', path.join(__dirname, '../public/views'));
    app.use(serveStatic(path.join(__dirname, '../public')));
    app.engine('html', require('ejs').renderFile);

    app.get("/", function(req, res, next) {
        res.render(path.join(__dirname, '../public/views', 'root.html'));
    });

    app.use(function(req, res, next) {
        var reqd = require('domain').create();
        reqd.add(req);
        reqd.add(res);
        reqd._req = req;
        process.domain = reqd;
        next();
    });

    reporter.initializeListener.add(definition.name, this, function() {
        app.stack = _.reject(app.stack, function(s) {
            return s.route == "/odata";
        });

        reporter.emit("express-before-odata", app);

        app.use("/odata", function(req, res, next) {
            req.reporterContext = reporter.startContext();
            next();
        });
        app.use("/odata", $data.JayService.OData.Utils.simpleBodyReader());
        app.use("/odata", $data.JayService.createAdapter(reporter.context.getType(), function(req, res) {
            return req.reporterContext;
        }));

        reporter.extensionsManager.extensions.map(function(e) {
            app.use('/extension/' + e.name, express.static(e.directory));
        });
    });

    reporter.extensionsManager.on("extension-registered", function(extension) {
        reporter.emit("express-configure", app);
    });

    app.get("/html-templates", function(req, res, next) {
        var paths = reporter.extensionsManager.extensions.map(function(e) {
            return path.join(e.directory, 'public', 'templates');
        });

        var templates = [];

        async.eachSeries(paths, function(p, icb) {
            dir.readFiles(p, function(err, content, filename, nextFile) {
                if (content.charAt(0) === '\uFEFF')
                    content = content.substr(1);

                templates.push({
                    name: path.basename(filename, '.html'),
                    content: content
                });
                nextFile();
            }, function() {
                icb();
            });
        }, function() {
            res.send(templates);
        });
    });

    app.get("/api/version", function(req, res, next) {
        res.send("0.1");
    });

    app.get("/api/settings", function(req, res, next) {
        res.send({
            playgroundMode: reporter.playgroundMode,
            mode: reporter.options.mode,
            tenant: reporter.options.tenant
            
        });
    });

    app.post("/api/report", function(req, res, next) {
        req.template = req.body.template;
        req.data = req.body.data;
        req.options = req.body.options;

        reporter.render(req).then(function(response) {
            if (response.headers) {
                for (var key in response.headers) {
                    res.setHeader(key, response.headers[key]);
                }
            }

            res.setHeader("X-XSS-Protection", 0);

            if (_.isFunction(response.result.pipe)) {
                response.result.pipe(res);
            } else {
                res.send(response.result);
            }
        }).fail(function(err) {
            return next(err);
        });
    });

    app.get("/api/recipe", function(req, res, next) {
        res.json(_.map(reporter.extensionsManager.recipes, function(r) { return r.name; }));
    });

    app.get("/api/engine", function(req, res, next) {
        reporter.getEngines(function(err, engines) {
            if (err) {
                return next(err);
            }

            return res.json(engines);
        });
    });

    app.get("/api/extensions", function(req, res, next) {
        res.json(reporter.extensionsManager.availableExtensions);
    });

    app.post("/api/extensions", function(req, res, next) {
        reporter.extensionsManager.use(req.body.name).then(function() {
            return res.send("ok");
        });

    });

    app.delete("/api/extensions", function(req, res, next) {
        reporter.extensionsManager.unregister(req.body.name).then(function() {
            return res.send("ok");
        });
    });
    
    app.use(function(err, req, res, next) {
        res.status(500);

        if (_.isString(err)) {
            err = {
                message: err
            };
        }

        err = err || {};
        err.message = err.message || "Unrecognized error";

        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

        var logFn = err.weak ? reporter.logger.warn : reporter.logger.error;
        
        logFn("Error during processing request: " + fullUrl + " details: " + err.message + " " + err.stack);

        if (req.get('Content-Type') != "application/json") {
            res.write("Error occured - " + err.message + "\n");
            if (err.stack != null)
                res.write("Stack - " + err.stack);
            res.end();
            return;
        }
        
        res.json(err);
    });
};