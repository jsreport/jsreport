/*!
 * Copyright(c) 2014 Jan Blaha 
 */
/*globals $data */

var async = require("async"),
    express = require('express'),
    _ = require("underscore"),
    path = require("path"),
    dir = require("node-dir"),
    odata_server = require('odata-server'),
    Q = require("q"),
    serveStatic = require('serve-static');


module.exports = function(reporter, definition) {
    var app = definition.options.app;
    app.set('views', path.join(__dirname, '../public/views'));
    app.use(serveStatic(path.join(__dirname, '../public')));
    app.engine('html', require('ejs').renderFile);

    app.get("/", function(req, res, next) {
        if (reporter.options.NODE_ENV !== "development")
            res.render(path.join(__dirname, '../public/views', 'root_built.html'),reporter.options);
        else
            res.render(path.join(__dirname, '../public/views', 'root_dev.html'),reporter.options);
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
            return s.route === "/odata";
        });

        reporter.emit("express-before-odata", app);

        app.use("/odata", function(req, res, next) {
            reporter.dataProvider.startContext().then(function(context) {
                req.reporterContext = context;
                next();
            });
        });
        app.use("/odata", $data.JayService.OData.Utils.simpleBodyReader());
        app.use("/odata", function(req, res, next) {
            req.fullRoute = req.protocol + '://' + req.get('host') + "/odata";

            $data.JayService.createAdapter(req.reporterContext.getType(), function(req, res) {
                return req.reporterContext;
            })(req,res, next);
        });

        reporter.extensionsManager.extensions.map(function(e) {
            app.use('/extension/' + e.name, express.static(e.directory));
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

            if (req.get('Content-Type').indexOf("application/json") === -1) {
                res.write("Error occured - " + err.message + "\n");
                if (err.stack)
                    res.write("Stack - " + err.stack);
                res.end();
                return;
            }

            //its somehow not able to serialize original err
            res.send({ message: err.message, stack: err.stack});
        });
    });

    reporter.extensionsManager.on("extension-registered", function(extension) {
        reporter.emit("express-configure", app);
    });

    /**
     * Main entry point for invoking report rendering
     */
    app.post("/api/report", function(req, res, next) {
        req.template = req.body.template;
        req.data = req.body.data;
        req.options = req.body.options;

        if (!req.template)
            return next("Could not parse report template, aren't you missing content type?");

        reporter.render(req).then(function(response) {
            //copy headers to the final response
            if (response.headers) {
                for (var key in response.headers) {
                    if (response.headers.hasOwnProperty(key))
                        res.setHeader(key, response.headers[key]);
                }
            }

            res.setHeader("X-XSS-Protection", 0);

            if (_.isFunction(response.result.pipe)) {
                response.result.pipe(res);
            } else {
                res.send(response.result);
            }
        }).catch(next);
    });

    /**
     * Get all jsrender html templates used to render jsreport studio in one chunk
     */
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
        res.send(require('../../../package.json').version);
    });

    app.get("/api/settings", function(req, res, next) {
        res.send({
            tenant: reporter.options.tenant
        });
    });

    app.get("/api/recipe", function(req, res, next) {
        res.json(_.map(reporter.extensionsManager.recipes, function(r) { return r.name; }));
    });

    app.get("/api/engine", function(req, res, next) {
        reporter.getEngines().then(function(engines) {
            return res.json(engines);
        }).catch(next);
    });

    app.get("/api/extensions", function(req, res, next) {
        res.json(reporter.extensionsManager.availableExtensions);
    });
};