var serveStatic = require("serve-static"),
    path = require("path"),
    _ = require("underscore"),
    express = require("express"),
    async = require("async"),
    dir = require("node-dir");

var oneMonth = 31*86400000;

module.exports = function(app, reporter) {

    app.use(serveStatic(path.join(__dirname, '../public'), { maxAge: oneMonth }));

    app.get("/", function (req, res, next) {
        reporter.options.hostname = require("os").hostname();
        if (reporter.options.NODE_ENV !== "development")
            res.render(path.join(__dirname, '../public/views', 'root_built.html'), reporter.options);
        else
            res.render(path.join(__dirname, '../public/views', 'root_dev.html'), reporter.options);
    });

    app.stack = _.reject(app.stack, function (s) {
        return s.route === "/odata";
    });

    reporter.emit("express-before-odata", app);

    app.use("/odata", function (req, res, next) {
        reporter.dataProvider.startContext().then(function (context) {
            req.reporterContext = context;
            next();
        }).fail(function(e) {
            next(e);
        });
    });
    app.use("/odata", $data.JayService.OData.Utils.simpleBodyReader());
    app.use("/odata", function (req, res, next) {
        req.fullRoute = req.protocol + '://' + req.get('host') + "/odata";

        $data.JayService.createAdapter(req.reporterContext.getType(), function (req, res) {
            return req.reporterContext;
        })(req, res, next);
    });

    reporter.extensionsManager.extensions.map(function (e) {
        app.use('/extension/' + e.name, serveStatic(e.directory, { maxAge: oneMonth }));
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
            tenant: req.user
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

    app.get("/api/ping", function(req, res, next) {
        res.send("pong");
    });

    app.use(function (err, req, res, next) {
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

        if (!req.get('Content-Type') || req.get('Content-Type').indexOf("application/json") === -1) {
            res.write("Error occured - " + err.message + "\n");
            if (err.stack)
                res.write("Stack - " + err.stack);
            res.end();
            return;
        }

        //its somehow not able to serialize original err
        res.send({ message: err.message, stack: err.stack});
    });
};