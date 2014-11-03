/*!
 * Copyright(c) 2014 Jan Blaha
 *
 */

var q = require("q"),
    path = require("path"),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    sessions = require("client-sessions"),
    S = require("string"),
    _ = require("underscore"),
    bodyParser = require("body-parser");

module.exports = function (reporter, definition) {

    if (!definition.options.admin)
        return;

    definition.options.admin.name = definition.options.admin.username;

    reporter.on("after-express-static-configure", function(app) {
        configureRoutes(reporter, app, definition.options.admin);
    });
};

function configureRoutes(reporter, app, admin) {

    app.use(sessions({
        cookieName: 'session',
        cookie: reporter.options.cookieSession.cookie,
        secret: reporter.options.cookieSession.secret,
        duration: 1000 * 60 * 60 * 24 * 365 * 10 // forever
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(function (username, password, done) {
        if (admin.username === username && admin.password === password) {
            done(null, admin);
        }
        else {
            done(null, false, { message: "Invalid password or user does not exists." });
        }
    }));

    passport.use(new BasicStrategy(function (username, password, done) {
        if (admin.username === username && admin.password === password) {
            done(null, admin);
        }
        else {
            done(null, false, { message: "Invalid password or user does not exists." });
        }
    }));

    passport.serializeUser(function (user, done) {
        done(null, user.username);
    });

    passport.deserializeUser(function (id, done) {
        if (id === admin.username)
            done(null, admin);
        else
            done("Invalid username");
    });

    app.get("/login", function (req, res, next) {
        if (!req.user) {
            var viewModel = _.extend({}, req.session.viewModel || {});
            req.session.viewModel = null;
            return res.render(path.join(__dirname, '../public/views', 'login.html'), { viewModel: viewModel });
        }
        else {
            next();
        }
    });

    app.post('/login', bodyParser.urlencoded({ extended: true, limit: "2mb"}),  function (req, res, next) {
        req.session.viewModel = req.session.viewModel || {};

        passport.authenticate('local', function (err, user, info) {
            if (err) {
                return next(err);
            }

            if (!user) {
                req.session.viewModel.login = info.message;
                return res.redirect('/login');
            }

            req.session.viewModel = {};
            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }

                return res.redirect('/');
            });
        })(req, res, next);
    });

    app.post("/logout", function (req, res) {
        req.logout();
        res.redirect("/login");
    });

    app.use(function (req, res, next) {
        if ((!req.isAuthenticated || !req.isAuthenticated()) &&
            (req.url.indexOf("/api") > -1 || req.url.indexOf("/odata") > -1) &&
            req.query.mode !== "embedded") {

            passport.authenticate('basic', function (err, user, info) {
                if (!user) {
                    res.setHeader('WWW-Authenticate', 'Basic realm=\"realm\"');
                    return res.status(401).end();
                }

                req.logIn(user, function () {
                    next();
                });
            })(req, res, next);
        } else {
            next();
        }
    });

    app.use(function (req, res, next) {
        console.log("mode is " + req.query.mode + " for " + req.url);
        if (req.query.mode === "embedded" || req.user || S(req.url).startsWith("/css") || S(req.url).startsWith("/img") ||
            S(req.url).startsWith("/extension/embedding/public/embed.min.js")) {
            return next();
        }

        return res.redirect("/login");
    });
}
