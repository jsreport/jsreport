var Reporter = require("./reporter.js"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    path = require("path"),
    _ = require("underscore"),
    express = require("express");

module.exports = function(app, options) {

    if (options.mode == "playground") {
        options.express = { app: app };
        options.playgroundMode = true;
        options.connectionString.databaseName = "playground";
        var reporter = new Reporter(options);
        reporter.init();
        return;
    }

    if (options.mode == "standard") {
        options.express = { app: app };
        options.playgroundMode = false;
        options.connectionString.databaseName = "standard";
        var reporter = new Reporter(options);
        reporter.init();
        return;
    }

    if (options.mode != "multitenant")
        throw new Error("Unsuported mode");

    var Multitenancy = require("./multitenancy.js"),
        passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        BasicStrategy = require('passport-http').BasicStrategy;

    function activateTenant(tenant, cb) {
        var opts = _.extend({}, options);
        var main = express();

        //main.use(expressWinston.logger({
        //    transports: [new winston.transports.Console(transportSettings),
        //        new (winston.transports.File)({ filename: 'reporter.log' })]
        //}));

        opts.express = { app: main };
        opts.tenant = tenant;
        opts.playgroundMode = false;
        opts.connectionString.databaseName = tenant.name;
        var rep = new Reporter(opts);

        app.use(express.vhost(tenant.name + '.*', main));

        rep.init(function() {
            if (cb != null)
                cb(null);
        });
    }

    var multitenancy = new Multitenancy();
    multitenancy.findTenants().then(function(tenants) {
        tenants.forEach(function(t) { activateTenant(t); });
    });

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(function(username, password, done) {
        var tenant = multitenancy.authenticate(username, password);
        if (tenant == null)
            return done(null, false, { message: "Invalid password or user does not exists." });

        return done(null, tenant);
    }));

    passport.use(new BasicStrategy(function(username, password, done) {
            var tenant = multitenancy.authenticate(username, password);
            if (tenant == null)
                return done(null, false);

            return done(null, true);
        }
    ));

    app.use(function(req, res, next) {
        var isUrlRequirignAuthnetication =
        (req.method != "POST" || req.url != "/login") &&
            (req.method != "GET" || req.url != "/") &&
            (req.method != "POST" || req.url != "/register");

        if ((!req.isAuthenticated || !req.isAuthenticated()) && isUrlRequirignAuthnetication) {

            if (req.headers["authorization"] != null) {
                passport.authenticate('basic', function(err, result, info) {
                    if (!result) {
                        return res.send(401);
                    }
                    return next();
                })(req, res, next);
            } else {

                if (req.session) {
                    req.session.returnTo = req.originalUrl || req.url;
                }

                return res.redirect("/");
            }
        } else {
            return next();
        }
    });

    passport.serializeUser(function(user, done) {
        done(null, user.email);
    });

    passport.deserializeUser(function(id, done) {
        done(null, multitenancy.findTenant(id));
    });

    app.get("/ping", function(req, res, next) {
        res.send("pong");
    });

    app.get("/", function(req, res, next) {
        if (req.user != null) {
            var domains = req.headers.host.split('.');

            if (domains.length == 3) {
                return next();
            } else {
                domains.unshift(req.user.name);
                res.redirect("http://" + domains.join("."));
            }
        }

        var viewModel = _.extend({}, req.session.viewModel || {});
        req.session.viewModel = null;
        res.render(path.join(__dirname, 'views', 'tenantRegistration.html'), { viewModel: viewModel });
    });

    app.post('/login', function(req, res, next) {
        req.session.viewModel = req.session.viewModel || {};

        passport.authenticate('local', function(err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                req.session.viewModel.login = info.message;
                return res.redirect('/');
            }

            req.session.viewModel = {};
            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }
                return res.redirect('/');
            });
        })(req, res, next);
    });

    app.post("/register", function(req, res) {
        req.session.viewModel = req.session.viewModel || {};
        req.session.viewModel.previousName = req.body.name;
        req.session.viewModel.previousUsername = req.body.username;

        var regex = /^[a-zA-Z0-9]+$/;
        if (!regex.test(req.body.name)) {
            req.session.viewModel.name = "Name must contain only numbers and letters.";
            return res.redirect('/');
        }

        if (multitenancy.findTenantByName(req.body.name) != null) {
            req.session.viewModel.name = "Tenant name is already taken.";
            return res.redirect('/');
        }

        if (req.body.password == null || req.body.password.length < 4) {
            req.session.viewModel.password = "Password must be at least 4 characters long.";
            return res.redirect('/');
        }

        if (req.body.password != req.body.passwordConfirm) {
            req.session.viewModel.passwordConfirm = "Passwords are not the same.";
            return res.redirect('/');
        }

        multitenancy.registerTenant(req.body.username, req.body.name, req.body.password).then(function(tenant) {
            activateTenant(tenant, function() {
                passport.authenticate('local', { successReturnToOrRedirect: '/' })(req, res);
            });
        }, function() {

        });
    });

    app.post("/logout", function(req, res) {
        req.logout();
        res.redirect('/');
    });
}