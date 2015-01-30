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
    bodyParser = require("body-parser"),
    UsersRepository = require("./usersRepository");

function addPassport(reporter, app, admin, definition) {
    if (app.isAuthenticated)
        return;

    app.use(sessions({
        cookieName: 'session',
        cookie: definition.options.cookieSession.cookie,
        secret: definition.options.cookieSession.secret,
        duration: 1000 * 60 * 60 * 24 * 365 * 10 // forever
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    function authenticate(username, password, done) {
        if (admin.username === username && admin.password === password) {
            return done(null, admin);
        }

        reporter.authentication.usersRepository.authenticate(username, password).then(function(user) {
            if (!user) {
                return done(null, false, {message: "Invalid password or user does not exists."});
            }

            return done(null, user);
        }).catch(function(e){
            done(null, false, {message: e.message});
        });
    }

    passport.use(new LocalStrategy(authenticate));

    passport.use(new BasicStrategy(authenticate));

    passport.serializeUser(function (user, done) {
        done(null, user.username);
    });

    passport.deserializeUser(function (id, done) {
        if (id === admin.username)
            return done(null, admin);

        reporter.authentication.usersRepository.find(id).then(function(user) {
            done(null, user);
        }).catch(function(e) {
            done(e);
        });
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
                return res.redirect('/login?returnUrl=' + encodeURIComponent(req.query.returnUrl || "/"));
            }

            req.session.viewModel = {};
            req.logIn(user, function (err) {
                if (err) {
                    return next(err);
                }

                return res.redirect(decodeURIComponent(req.query.returnUrl) || "/");
            });
        })(req, res, next);
    });

    app.post("/logout", function (req, res) {
        req.logout();
        res.redirect("/");
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
}

function configureRoutes(reporter, app, admin, definition) {
    app.use(function(req, res, next) {
        var publicRoute = _.find(reporter.authentication.publicRoutes, function (r) {
            return S(req.url).startsWith(r);
        });

        var pathname = url.parse(req.url).pathname;

        req.isPublic = publicRoute || S(pathname).endsWith(".js") || S(pathname).endsWith(".css");
        next();
    });

    addPassport(reporter, app, admin, definition);

    app.use(function (req, res, next) {
        if (req.isAuthenticated() || req.isPublic) {
            return next();
        }

        var viewModel = _.extend({}, req.session.viewModel || {});
        req.session.viewModel = null;
        return res.render(path.join(__dirname, '../public/views', 'login.html'), {viewModel: viewModel});
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

    app.post("/api/users/:shortid/password", function(req, res, next) {
       reporter.authentication.usersRepository.changePassword(req.user, req.params.shortid,req.body.oldPassword,req.body.newPassword).then(function(user) {
            res.send("ok");
        }).catch(function(e) {
            next(e);
        });
    });
}

function Authentication(reporter) {
    this.publicRoutes = [
        "/?studio=embed", "/css", "/img", "/js", "/lib", "/html-templates",
        "/api/recipe", "/api/engine", "/api/settings", "/favicon.ico", "/api/extensions", "/odata/settings"];

    this.usersRepository = new UsersRepository(reporter);
}

module.exports = function (reporter, definition) {

    if (!definition.options.admin)
        return;

    definition.options.admin.name = definition.options.admin.username;
    definition.options.admin.isAdmin = true;

    reporter.authentication = new Authentication(reporter);

    reporter.on("export-public-route", function (route) {
        reporter.authentication.publicRoutes.push(route);
    });

    reporter.on("after-express-static-configure", function (app) {
        configureRoutes(reporter, app, definition.options.admin, definition);
    });
};
