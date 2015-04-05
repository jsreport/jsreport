var serveStatic = require("serve-static"),
    path = require("path"),
    _ = require("underscore"),
    express = require("express"),
    async = require("async"),
    dir = require("node-dir"),
    extend = require("node.extend"),
    S = require("string"),
    fs = require("fs");

var oneMonth = 31 * 86400000;

module.exports = function (app, reporter) {
    var originalMode = reporter.options.mode;

    function handleError(req, res, err) {
        res.status(500);

        if (_.isString(err)) {
            err = {
                message: err
            };
        }

        err = err || {};
        err.message = err.message || "Unrecognized error";

        if (err.unauthorized) {
            res.setHeader('WWW-Authenticate', 'Basic realm=\"realm\"');
            res.status(401).end();
            return;
        }

        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

        var logFn = err.weak ? reporter.logger.warn : reporter.logger.error;

        logFn("Error during processing request: " + fullUrl + " details: " + err.message + " " + err.stack);

        if ((req.get('Content-Type') && (req.get('Content-Type').indexOf("application/json") !== -1)) ||
            (req.get('Accept') && (req.get('Accept').indexOf("application/json") !== -1))) {
            return res.send({message: err.message, stack: err.stack});
        }

        res.write("Error occured - " + err.message + "\n");
        if (err.stack)
            res.write("Stack - " + err.stack);
        res.end();
    }

    app.use(function (req, res, next) {
        res.error = function (err) {
            handleError(req, res, err);
        };

        next();
    });

    //we need to change referenced fonts relative url to the absolute one because of embedded studio
    app.get("/css/font-awesome/css/font-awesome.min.css", function (req, res, next) {
        var options = getOptions(req);

        fs.readFile(path.join(__dirname, "../", "public", "css", "font-awesome", "css", "font-awesome.min.css"), "utf8", function (error, data) {
            if (error)
                return next(error);

            res.setHeader("Content-Type", "text/css");

            if (!options.serverUrl || options.serverUrl === "")
                return res.send(data);

            res.send(data.replace(new RegExp('../fonts/', 'g'), options.serverUrl + "css/font-awesome/fonts/"));
        });
    });

    app.use(serveStatic(path.join(__dirname, '../public'), {maxAge: oneMonth}));

    reporter.emit("after-express-static-configure", app);

    function getOptions(req) {
        var optionsClone = extend(true, {}, reporter.options);
        optionsClone = extend(true, optionsClone, req.query);
        optionsClone.studio = optionsClone.studio || "normal";
        optionsClone.serverUrl = optionsClone.serverUrl || "/";
        optionsClone.version = require('../../../package.json').version;

        return optionsClone;
    }

    app.get("/", function (req, res, next) {
        var options = getOptions(req);

        reporter.options.hostname = require("os").hostname();

        if (options.mode === "development")
            res.render(path.join(__dirname, '../public/views', 'root_dev.html'), options);

        if (options.mode === "production")
            res.render(path.join(__dirname, '../public/views', 'root_built.html'), options);
    });

    reporter.emit("express-before-odata", app);

    var odataServer = require("simple-odata-server")();
    reporter.documentStore.adaptOData(odataServer);

    odataServer.error(function (req, res, err, def) {
        if (err.unauthorized) {
            res.error(err);
        }
        else {
            reporter.logger.error("Error when processing OData " + req.method + ": " + req.originalUrl + "; " + err.stack);
            def(err);
        }
    });


    app.use("/odata", function (req, res) {
        odataServer.handle(req, res);
    });

    reporter.extensionsManager.extensions.map(function (e) {
        app.use('/extension/' + e.name, serveStatic(e.directory, {maxAge: oneMonth}));
    });

    /**
     * Main entry point for invoking report rendering
     */
    app.post("/api/report", function (req, res, next) {
        req.template = req.body.template;
        req.data = req.body.data;
        req.options = req.body.options || {};

        extend(true, req.headers, req.body.headers);

        if (!req.template)
            return next("Could not parse report template, aren't you missing content type?");

        reporter.render(req).then(function (response) {
            //copy headers to the final response
            if (response.headers) {
                for (var key in response.headers) {
                    if (response.headers.hasOwnProperty(key))
                        res.setHeader(key, response.headers[key]);
                }
            }

            if (!response.headers["Content-Disposition"]) {
                res.setHeader("Content-Disposition", (req.options.preview ? "inline" : "attachment") + ";filename=report." + response.headers["File-Extension"]);
            }

            res.setHeader("X-XSS-Protection", 0);

            if (_.isFunction(response.result.pipe)) {
                response.result.pipe(res);
            } else {
                res.send(response.result);
            }
        }).catch(next).done();
    });

    /**
     * Get all jsrender html templates used to render jsreport studio in one chunk
     */
    app.get("/html-templates", function (req, res, next) {
        var options = getOptions(req);

        var paths = reporter.extensionsManager.extensions.map(function (e) {
            return path.join(e.directory, 'public', 'templates');
        });

        var templates = [];

        async.eachSeries(paths, function (p, icb) {
            dir.readFiles(p, function (err, content, filePath, nextFile) {
                if (content.charAt(0) === '\uFEFF')
                    content = content.substr(1);

                var filename = path.basename(filePath, '.html');

                if (options.studio !== "embed" || S(filename).startsWith("embed")) {
                    templates.push({
                        name: filename,
                        content: content
                    });
                }
                nextFile();
            }, function () {
                icb();
            });
        }, function () {
            res.send(templates);
        });
    });

    app.get("/api/version", function (req, res, next) {
        res.send(require('../../../package.json').version);
    });

    app.get("/api/settings", function (req, res, next) {
        res.send({
            tenant: req.user
        });
    });

    app.get("/api/recipe", function (req, res, next) {
        res.json(_.map(reporter.extensionsManager.recipes, function (r) {
            return r.name;
        }));
    });

    app.get("/api/engine", function (req, res, next) {
        reporter.getEngines().then(function (engines) {
            return res.json(engines);
        }).catch(next);
    });

    app.get("/api/extensions", function (req, res, next) {
        res.json(reporter.extensionsManager.availableExtensions);
    });

    app.get("/api/ping", function (req, res, next) {
        res.send("pong");
    });

    app.use(function (err, req, res, next) {
        handleError(req, res, err);
    });
};