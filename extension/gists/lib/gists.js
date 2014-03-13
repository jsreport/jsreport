/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension allowing to bind template with github gists.
 * 
 * DEVELOPMENT POSPTONED
 */ 

var winston = require("winston"),
    github = require('octonode'),
    Q = require("q"),
    url = require("url"),
    qs = require("querystring"),
    extend = require("node.extend");

var logger = winston.loggers.get('jsreport');

module.exports = function(reporter, definition) {
    reporter[definition.name] = new Gists(reporter, definition);
};

Gists = function(reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    if (this.reporter.playgroundMode) {
        reporter.templates.TemplateType.addMember("gistId", { type: "string" });
    }

    reporter.templates.TemplateType.addEventListener("beforeCreate", Gists.prototype._beforeCreateHandler.bind(this));
    reporter.templates.TemplateType.addEventListener("beforeUpdate", Gists.prototype._beforeUpdateHandler.bind(this));
    reporter.templates.on("validate-update", function(context) {
        if (process.domain._req.session.gist != null && (process.domain._req.session.shortid == context.template.shortid))
            return true;
    });

    this.reporter.on("express-configure", Gists.prototype._configureExpress.bind(this));
};

Gists.prototype._beforeCreateHandler = function(args, entity) {
};

Gists.prototype._beforeUpdateHandler = function(args, entity) {

};


Gists.prototype._configureExpress = function(app) {
    var auth_url = github.auth.config({
        id: 'e38e7f95b1bcfb224fd6',
        secret: 'afa7a02b9377f3b3c724e2c6b988f168573ba15f',
    }).login(['gist']);

    var state = auth_url.match(/&state=([0-9a-z]{32})/i);

    app.get("/api/gists/login", function(req, res) {
        console.log("getting login");
        res.writeHead(307, { 'Content-Type': 'text/plain', 'Location': auth_url + "&redirect_uri=https://local.net:3000/api/gists/cb" });
        res.end('Redirecting to ' + auth_url);
    });

    app.get("/api/gists/validate", function(req, res) {
        res.send({ result: req.session.gist != null });
    });

    app.post("/api/gists/:gistId", function(req, res) {
        console.log("posting gist");
        github.auth.login(req.session.gist, function(err, token) {
            github.gist().edit(req.params.gistId, { content: "foo" }, function() {
                res.send("ok");
            });
        });
    });

    app.get("/api/gists/cb", function(req, res) {
        console.log("getting cb");
        var uri = url.parse(req.url);
        var values = qs.parse(uri.query);
        // Check against CSRF attacks
        if (!state || state[1] != values.state) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('');
        } else {
            github.auth.login(values.code, function(err, token) {
                req.session.gist = values.code;
                res.send("closing....");
            });
        }
    });
};