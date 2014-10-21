/*!
 * Copyright(c) 2014 Jan Blaha 
 */
/*globals $data */

var async = require("async"),
    express = require('express'),
    _ = require("underscore"),
    path = require("path"),
    odata_server = require('odata-server'),
    q = require("q"),
    bodyParser = require("body-parser"),
    fs = require("fs"),
    http = require("http"),
    https = require("https"),
    cluster = require("cluster"),
    cors = require('cors'),
    routes = require("./routes.js"),
    multer  = require('multer');


module.exports = function(reporter, definition) {

    reporter.express = {};
    var app = definition.options.app;

    if (!app) {
        app = express();
    }

    reporter.initializeListener.add(definition.name, this, function() {
        if (definition.options.app) {
            reporter.logger.info("Configuring routes for existing express app.")
            return configureExpressApp(app, reporter)
        }

        reporter.logger.info("Creating default express app.");
        configureExpressApp(app, reporter, definition);
        return startExpressApp(reporter, app, reporter.options);
    });
};

var startExpressApp = function(reporter, app, config) {
    //no port, use process.env.PORT, this is used when hosted in iisnode
    if (!config.httpPort && !config.httpsPort) {
        reporter.express.server = http.createServer(app);
        return q.ninvoke(reporter.express.server, "listen", process.env.PORT);
    }

    //just http port is specified, lets start server on http
    if (!config.httpsPort) {
        reporter.express.server = http.createServer(function(req, res) { useCluster(reporter, req, res); }).on('error', function (e) {
            console.error("Error when starting http server on port " + config.httpPort + " " + e.stack);
        });

        return q.ninvoke(reporter.express.server, 'listen', config.httpPort);
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

    reporter.express.server = https.createServer(credentials, function(req, res) { useCluster(reporter, req, res); }).on('error', function (e) {
        console.error("Error when starting https server on port " + config.httpsPort + " " + e.stack);
    });

    return q.ninvoke(reporter.express.server, 'listen', config.httpsPort);
};

var configureExpressApp = function(app, reporter){
    reporter.express.app = app;
    app.use(bodyParser.urlencoded({ extended: true,  limit: "2mb"}));
    app.use(bodyParser.json({
        limit: "2mb"
    }));

    app.set('views', path.join(__dirname, '../public/views'));
    app.engine('html', require('ejs').renderFile);

    app.use(multer({ dest: reporter.options.tempDirectory}));
    app.use(cors());

    routes(app, reporter);

    reporter.emit("express-configure", app);

    if (reporter.options.httpsPort)
        reporter.logger.info("jsreport server successfully started on https port: " + reporter.options.httpsPort);

    if (reporter.options.httpPort)
        reporter.logger.info("jsreport server successfully started on http port: " + reporter.options.httpPort);

    if (!reporter.options.httpPort && !reporter.options.httpsPort && reporter.express.server)
        reporter.logger.info("jsreport server successfully started on http port: " + reporter.express.server.address().port);
}

var useCluster = function(reporter, req, res) {
    if (reporter.options.cluster && reporter.options.cluster.enabled) {
        return require("./clusterDomainMiddleware.js")(reporter.options.cluster.instance, reporter.express.server, reporter.logger, req, res, reporter.express.app);
    }

    reporter.express.app(req, res);
}