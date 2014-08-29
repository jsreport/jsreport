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
    routes = require("./routes.js");

module.exports = function(reporter, definition) {
    reporter.express = {};
    var app = definition.options.app;

    if (app) {
        reporter.logger.info("Configuring routes for existing express app.")
        return configureExpressApp(app, reporter, definition)
    }

    reporter.logger.info("Creating default express app.")
    app = express();

    return startExpressApp(reporter, app, reporter.options).then(function(server) {
        return configureExpressApp(app, reporter, definition);
    });
};

var startExpressApp = function(reporter, app, config) {
    //no port, use process.env.PORT, this is used when hosted in iisnode
    if (!config.httpPort && !config.httpsPort) {
        return q.ninvoke(app, "listen", process.env.PORT);
    }

    //just http port is specified, lets start server on http
    if (!config.httpsPort) {
        reporter.express.server = http.createServer(app).on('error', function (e) {
            console.error("Error when starting http server on port " + config.httpPort + " " + e.stack);
        });

        if (config.useCluster) {
            addDomainCluster(app, reporter.express.server, config._cluster);
        }

        return q.ninvoke(reporter.express.server, 'listen', config.httpPort).then(function() {
            reporter.express.server.setTimeout(5 * 60 * 1000);
        });
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

    var server = https.createServer(credentials, app).on('error', function (e) {
        console.error("Error when starting https server on port " + config.httpsPort + " " + e.stack);
    });

    if (config.useCluster) {
        app.use(require("./clusterDomainMiddleware.js")(cluster, server));
    }

    return q.ninvoke(server, 'listen', config.httpsPort);
};

var configureExpressApp = function(app, reporter, definition){
    reporter.express.app = app;
    app.use(bodyParser.urlencoded({ extended: true,  limit: "2mb"}));
    app.use(bodyParser.json({
        limit: "2mb"
    }));
    app.use(require("connect-multiparty")());

    app.set('views', path.join(__dirname, '../public/views'));
    app.engine('html', require('ejs').renderFile);

    reporter.initializeListener.add(definition.name, this, function() {
        routes(app, reporter);
    });

    reporter.extensionsManager.on("extension-registered", function(extension) {
        reporter.emit("express-configure", app);
    });
}