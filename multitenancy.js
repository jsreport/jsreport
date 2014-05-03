/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Installing express server for multi-user support.
 * Responsible for authorizing requests and forwarding them to particular tenants vhosts.
 */ 

var Q = require("q"),
    _ = require("underscore"),
    passwordHash = require('password-hash'),
    extend = require("node.extend"),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    BasicStrategy = require('passport-http').BasicStrategy,
    async = require("async"),
    express = require("express"),
    Reporter = require("./reporter.js"),
    path = require("path"),
    validator = require('validator'),
    serveStatic = require('serve-static'),
    odataServer = require("odata-server");

module.exports = function(app, options, cb) {
   
    /**
     * Create child vhost for tenant and initialize dedicated {Reporter}
     * @param {$entity.Tenant} tenant
     * @param {function} tcb
     */
    function activateTenant(tenant, tcb) {
        if (tenant.isActivated) {
            return tcb(null, tenant);
        }

        var opts = extend(true, {}, options);
        var main = express();

        opts.express = { app: main };
        opts.tenant = tenant;
        opts.playgroundMode = false;
        //single databased for all tenants
        opts.connectionString.databaseName = "multitenant"; 

        var rep = new Reporter(opts);

        rep.init().then(function() {
            tenant.isActivated = true;
            tenant.reporter = rep;
            tcb(null, tenant);
        });
    }

    app.use(passport.initialize());
    app.use(passport.session());
    app.use(serveStatic(path.join(__dirname, 'views')));
    app.engine('html', require('ejs').renderFile);

    app.use(function(err, req, res, next) {
        res.status(500);

        if (_.isString(err)) {
            err = {
                message: err
            };
        }

        err = err || {};
        err.message = err.message || "Unrecognized error";

        if (err.code == "TENANT_NOT_FOUND") {
            req.session = null;
            return res.redirect("/");
        }

        if (req.get('Content-Type') != "application/json") {
            res.write("Error occured - " + err.message + "\n");
            if (err.stack != null)
                res.write("Stack - " + err.stack);
            res.end();
            return;
        }

        res.json(err);
    });

    passport.use(new LocalStrategy(function(username, password, done) {
        multitenancy.authenticate(username, password).then(function(tenant) {
            if (tenant == null)
                return done(null, false, { message: "Invalid password or user does not exists." });

            return done(null, tenant);
        });
    }));

    passport.use(new BasicStrategy(function(username, password, done) {
        multitenancy.authenticate(username, password).then(function(tenant) {
            if (tenant == null)
                return done(null, false);

            activateTenant(multitenancy.findTenant(username), function() {
                return done(null, tenant);
            });
        });
    }));
    
    passport.serializeUser(function(user, done) {
        done(null, user.email);
    });

    passport.deserializeUser(function(id, done) {
        var tenant = multitenancy.findTenant(id);

        if (tenant == null)
            return done({
                message: "Tenant not found.",
                code: "TENANT_NOT_FOUND"
            });

        return done(null, tenant);
    });

    app.get("/", function(req, res, next) {
        if (!req.user) {
            var viewModel = _.extend({}, req.session.viewModel || {});
            req.session.viewModel = null;
            res.render(path.join(__dirname, 'views', 'tenantRegistration.html'), { viewModel: viewModel });
        } else {
            next();
        }
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

        var regex = /^[a-zA-Z0-9\-]+$/;
        if (!regex.test(req.body.name)) {
            req.session.viewModel.name = "Name must contain only numbers and letters and '-'.";
            return res.redirect('/');
        }

        if (multitenancy.findTenantByName(req.body.name) != null) {
            req.session.viewModel.name = "Tenant name is already taken.";
            return res.redirect('/');
        }

        if (!validator.isEmail(req.body.username)) {
            req.session.viewModel.username = "Not valid email.";
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
            passport.authenticate('local', function(err, user, info) {
                if (err) {
                    return next(err);
                }

                req.logIn(user, function(err) {
                    if (err) {
                        return next(err);
                    }
                    return res.redirect('/');
                });
            })(req, res);
        }, function() {
        });
    });

    app.post("/logout", function(req, res) {
        req.logout();

        var domains = req.headers.host.split('.');

        res.redirect("https://" + domains[domains.length - 2] + "." + domains[domains.length - 1]);
    });

    //authenticate basic if request to API
    app.use(function(req, res, next) {
        if ((!req.isAuthenticated || !req.isAuthenticated()) &&
            (req.url.lastIndexOf("/api", 0) === 0 || req.url.lastIndexOf("/odata", 0) === 0)) {
            passport.authenticate('basic', function(err, user, info) {
                if (!user) {
                    res.setHeader('WWW-Authenticate', 'Basic realm=\"realm\"');
                    return res.send(401);
                }

                req.logIn(user, function() {
                    next();
                });
            })(req, res, next);
        } else {
            next();
        }
    });
    
    app.use(function(req, res, next) {
        var domains = req.headers.host.split('.');
        
        if (!req.user) {
            if (!options.useSubDomains || options.subdomainsCount == domains.length + 1)
                //user not authenticated, redirect to login page
                return res.redirect("/");
            else {
                //user sending not authenticated request to subdomain, redirect to root login page
               domains.shift();
               return res.redirect("https://" + domains.join("."));  
            }
        }

        //user authenticated, activate tenant
        activateTenant(multitenancy.findTenant(req.user.email), function(err, tenant) {
            if (!options.useSubDomains || options.subdomainsCount == domains.length) {
                //route request to tenant
                return tenant.reporter.options.express.app(req, res, next);
            }

            //add tenant subdomain and route to root page
            domains.unshift(req.user.name);
            return res.redirect("https://" + domains.join("."));
        });
    });
    
     app.get("/ping", function(req, res, next) {
        res.send("pong");
    });
    
    var multitenancy = new Multitenancy(options);
    multitenancy.initialize().then(function(s) {
        cb();
    });

};


/**
 * Repository over tenants.
 */
var Multitenancy = function(options) {
    $data.Entity.extend("$entity.Tenant", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        createdOn: { type: "date" },
        lastLogin: { type: "date" },
        email: { type: "string" },
        name: { type: "string" },
        password: { type: "string" },
    });

    $data.EntityContext.extend("$entity.TenantContext", {
        tenants: { type: $data.EntitySet, elementType: $entity.Tenant }
    });

    this.options = extend(true, {}, options);

    this._tenantsCache = [];
};

Multitenancy.prototype.initialize = function() {
    var self = this;

    return this._createContext().then(function(context) {
        return context.tenants.toArray().then(function(tenants) {
            tenants.forEach(function(t) {
                self._tenantsCache[t.email] = t;
            });

            return Q(tenants);
        });
    });
};

Multitenancy.prototype.getTenants = function() {
    return _.values(this._tenantsCache);
};

Multitenancy.prototype.findTenant = function(email) {
    return this._tenantsCache[email];
};

Multitenancy.prototype.findTenantByName = function(name) {
    return _.findWhere(_.values(this._tenantsCache), { "name": name });
};

Multitenancy.prototype.registerTenant = function(email, name, password) {
    var self = this;
    return this._createContext().then(function(context) {
        var tenant = new $entity.Tenant({
            email: email,
            password: passwordHash.generate(password),
            createdOn: new Date(),
            name: name
        });

        self._tenantsCache[email] = tenant;
        context.tenants.add(tenant);

        return context.saveChanges().then(function() {
            return Q(tenant);
        });
    });


};

Multitenancy.prototype.authenticate = function(username, password) {
    var tenant = this._tenantsCache[username];

    if (tenant == null)
        return Q(null);

    return this._createContext().then(function(context) {
        context.attach(tenant);
        tenant.lastLogin = new Date();
        return context.saveChanges().then(function() {
            return (passwordHash.verify(password, tenant.password)) ? tenant : null;
        });
    });
};

Multitenancy.prototype._createContext = function() {
    var context = new $entity.TenantContext(this.options.connectionString);
    return context.onReady();
};