/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Extension used for authenticating user. When the extension is enabled user needs to specify
 * credentials before the jsreport will serve the request.
 *
 * Browser requests are authenticated using cookie.
 * API requests are authenticated using basic auth.
 */

var q = require("q"),
    path = require("path"),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    sessions = require("client-sessions"),
    S = require("string"),
    _ = require("underscore"),
    url = require("url"),
    bodyParser = require("body-parser");

function configureRoutes(reporter, app, admin, definition) {

    app.use(sessions({
        cookieName: 'session',
        cookie: definition.options.cookieSession.cookie,
        secret: definition.options.cookieSession.secret,
        duration: 1000 * 60 * 60 * 24 * 365 * 10 // forever
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(function (username, password, done) {
        if (admin.username === username && admin.password === password) {
            done(null, admin);
        }
        else {
            done(null, false, {message: "Invalid password or user does not exists."});
        }
    }));

    passport.use(new BasicStrategy(function (username, password, done) {
        if (admin.username === username && admin.password === password) {
            done(null, admin);
        }
        else {
            done(null, false, {message: "Invalid password or user does not exists."});
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
            return res.render(path.join(__dirname, '../public/views', 'login.html'), {viewModel: viewModel});
        }
        else {
            next();
        }
    });

    app.post('/login', bodyParser.urlencoded({extended: true, limit: "2mb"}), function (req, res, next) {
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
        res.redirect("/");
    });

    app.use(function(req, res, next) {
        var publicRoute = _.find(reporter.authentication.publicRoutes, function (r) {
            return S(req.url).startsWith(r);
        });

        var pathname = url.parse(req.url).pathname;

        req.isPublic = publicRoute || S(pathname).endsWith(".js") || S(pathname).endsWith(".css");
        next();
    });

    app.use(function (req, res, next) {
        if (!req.isAuthenticated() &&
            (req.url.indexOf("/api") > -1 || req.url.indexOf("/odata") > -1)) {

            passport.authenticate('basic', function (err, user, info) {
                if (!user) {
                    if (req.isPublic) {
                        return next();
                    }
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
        if (req.isAuthenticated() || req.isPublic) {
            return next();
        }

        return res.redirect("/login");
    });

    app.use(function (req, res, next) {
        if (!reporter.authorization || req.isPublic) {
            return next();
        }

        reporter.authorization.authorizeRequest(req, res).then(function(result) {
            if (result) {
                return next();
            }

            if (req.url.indexOf("/api") > -1 || req.url.indexOf("/odata") > -1) {
                res.setHeader('WWW-Authenticate', 'Basic realm=\"realm\"');
                return res.status(401).end();
            }

            return res.redirect("/login");
        }).catch(function(e) {
            next(e);
        });
    });
}

function Authentication() {
    this.publicRoutes = [
        "/?studio=embed", "/css", "/img", "/js", "/lib", "/html-templates",
        "/api/recipe", "/api/engine", "/api/settings", "/favicon.ico", "/api/extensions", "/odata/settings"];
}

module.exports = function (reporter, definition) {

    if (!definition.options.admin)
        return;

    definition.options.admin.name = definition.options.admin.username;

    reporter.authentication = new Authentication();

    reporter.on("export-public-route", function (route) {
        reporter.authentication.publicRoutes.push(route);
    });

    reporter.on("after-express-static-configure", function (app) {
        configureRoutes(reporter, app, definition.options.admin, definition);
    });
};
