/*!
 * Copyright(c) 2014 Jan Blaha 
 */
/*globals $data */

var express = require('express'),
    _ = require("underscore"),
    path = require("path"),
    q = require("q"),
    bodyParser = require("body-parser"),
    cookieParser = require('cookie-parser'),
    fs = require("fs"),
    http = require("http"),
    https = require("https"),
    cluster = require("cluster"),
    cors = require('cors'),
    routes = require("./routes.js"),
    multer  = require('multer');

var useDomainMiddleware = function(reporter, req, res) {
    var clusterInstance = (reporter.options.cluster && reporter.options.cluster.enabled) ? reporter.options.cluster.instance : null;

    require("./clusterDomainMiddleware.js")(clusterInstance, reporter.express.server, reporter.logger, req, res, reporter.express.app);
};

var startAsync = function(reporter, server, port) {
    var defer = q.defer();

    server.on('error', function (e) {
        reporter.logger.error("Error when starting http server on port " + port + " " + e.stack);
        defer.reject(e);
    }).on("listen", function() {
        defer.resolve();
    });

    server.listen(port, function () {
        defer.resolve();
    });

    return defer.promise;
};

var startExpressApp = function(reporter, app, config) {
    //no port, use process.env.PORT, this is used when hosted in iisnode
    if (!config.httpPort && !config.httpsPort) {
        reporter.express.server = http.createServer(app);
        return q.ninvoke(reporter.express.server, "listen", process.env.PORT);
    }

    //just http port is specified, lets start server on http
    if (!config.httpsPort) {
        reporter.express.server = http.createServer(function(req, res) { useDomainMiddleware(reporter, req, res); });

        return startAsync(reporter, reporter.express.server, config.httpPort);
    }

    //http and https port specified
    //fist start http => https redirector
    if (config.httpPort) {

        http.createServer(function (req, res) {
            res.writeHead(302, {
                'Location': "https://" + req.headers.host.split(':')[0] + ':' + config.httpsPort + req.url
            });
            res.end();
        }).listen(config.httpPort).on('error', function (e) {
            console.error("Error when starting http server on port " + config.httpPort + " " + e.stack);
        });
    }

    //second start https server
    if (!fs.existsSync(config.certificate.key)) {
        config.certificate.key = path.join(__dirname, "../../../", "certificates", "jsreport.net.key");
        config.certificate.cert = path.join(__dirname, "../../../", "certificates", "jsreport.net.cert");
    }

    var credentials = {
        key: fs.readFileSync(config.certificate.key, 'utf8'),
        cert: fs.readFileSync(config.certificate.cert, 'utf8'),
        rejectUnauthorized: false //support invalid certificates
    };

    reporter.express.server = https.createServer(credentials, function(req, res) { useDomainMiddleware(reporter, req, res); });

    return startAsync(reporter, reporter.express.server, config.httpsPort);
};

var configureExpressApp = function(app, reporter, definition){
    reporter.express.app = app;

    app.options('*', function(req, res) {
        require("cors")({
            methods : ["GET", "POST", "PUT", "DELETE", "PATCH", "MERGE"],
            origin: true
        })(req, res);
    });

    app.use(cookieParser());
    app.use(bodyParser.urlencoded({ extended: true,  limit: definition.options.inputRequestLimit || "20mb"}));
    app.use(bodyParser.json({
        limit: definition.options.inputRequestLimit || "20mb"
    }));

    app.set('views', path.join(__dirname, '../public/views'));
    app.engine('html', require('ejs').renderFile);

    app.use(multer({ dest: reporter.options.tempDirectory}));
    app.use(cors());

    reporter.emit("before-express-configure", app);

    routes(app, reporter);

    reporter.emit("express-configure", app);
};

module.exports = function(reporter, definition) {

    reporter.express = {};
    var app = definition.options.app;

    if (!app) {
        app = express();
    }

    reporter.initializeListener.add(definition.name, this, function() {

        function logStart() {
            if (reporter.options.httpsPort)
                reporter.logger.info("jsreport server successfully started on https port: " + reporter.options.httpsPort);

            if (reporter.options.httpPort)
                reporter.logger.info("jsreport server successfully started on http port: " + reporter.options.httpPort);

            if (!reporter.options.httpPort && !reporter.options.httpsPort && reporter.express.server)
                reporter.logger.info("jsreport server successfully started on http port: " + reporter.express.server.address().port);
        }

        if (definition.options.app) {
            reporter.logger.info("Configuring routes for existing express app.");
            configureExpressApp(app, reporter, definition);
            logStart();
            return;
        }

        reporter.logger.info("Creating default express app.");
        configureExpressApp(app, reporter, definition);

        return startExpressApp(reporter, app, reporter.options).then(function() {
            logStart();
        });
    });
};