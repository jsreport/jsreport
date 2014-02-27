/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var events = require("events"),
    util = require("util"),
    utils = require("./util.js"),
    fs = require("fs"),
    path = require('path'),
    winston = require("winston"),
    S = require("string"),
    _ = require("underscore"),
    ListenerCollection = require("./ListenerCollection.js");


var logger = winston.loggers.get('jsreport');

module.exports = ExtensionsManager = function(reporter, options) {
    var self = this;
    events.EventEmitter.call(this);

    this.availableExtensions = [];
    this.defaultExtensions = options.extensions.slice(0);
    this.recipes = [];
    this.reporter = reporter;
    this.options = options || {};

    this.beforeRenderListeners = utils.attachLogToListener(new ListenerCollection(), "before render", reporter.logger);
    this.afterRenderListeners = utils.attachLogToListener(new ListenerCollection(), "after render", reporter.logger);
    this.entitySetRegistrationListners = utils.attachLogToListener(new ListenerCollection(), "entitySet registration", reporter.logger);

    Object.defineProperty(this, "extensions", {
        get: function() {
            return self.availableExtensions.filter(function(e) { return e.isRegistered; });
        }
    });
};

util.inherits(ExtensionsManager, events.EventEmitter);

ExtensionsManager.prototype.init = function(cb) {
    var self = this;

    this._findAvailableExtensions(function(extensions) {
        extensions.forEach(function(e) { e.options = self.options[e.name]; });
        self.availableExtensions = extensions;

        self.registrationSetting = self.reporter.settings.get("registeredExtensions");

        if (self.registrationSetting == null) {
            logger.info("Extension registrations settings was not found. Creating new one");

            self.reporter.settings.add("registeredExtensions", self.defaultExtensions.toString(), function() {
                self.use(self.defaultExtensions, function() {
                    logger.info("Extensions loaded.");
                    cb();
                });
            });
        } else {
            logger.info("Extension registrations settings was found. ");

            self.registrationSetting.value = self.reporter.loadExtensionsFromPersistedSetting ?
                self.registrationSetting.value : self.defaultExtensions.toString();

            self.use(self.registrationSetting.value.split(","), function() {
                logger.info("Extensions loaded");
                cb();
            });
        }
    });
};

ExtensionsManager.prototype._useInternal = function(extension) {
    logger.info("Using extension " + extension);

    var extensionDefinition = _.findWhere(this.availableExtensions, { name: extension });
    require(path.join(extensionDefinition.directory, extensionDefinition.main)).call(this, this.reporter, extensionDefinition);

    extensionDefinition.isRegistered = true;

    this.emit("extension-registered", extensionDefinition);
};

ExtensionsManager.prototype.use = function(extension, cb) {
    var self = this;
    if (!_.isArray(extension))
        extension = [extension];

    extension.forEach(function(e) { self._useInternal(e); });
    this._refresh(cb);
};

ExtensionsManager.prototype._refresh = function(cb) {
    var self = this;

    var registredExtensionsString = this.extensions.map(function(e) { return e.name; }).toString();
    this.reporter.settings.set("registeredExtensions", registredExtensionsString, function() {
        self.reporter._initializeDataContext(true, function() {
            cb();
        });
    });
};

ExtensionsManager.prototype.unregister = function(extensionName, cb) {

    if (this.reporter.playgroundMode) {
        throw new Error("Cannot unregiester extensions in playground mode.");
    }

    var extensionToRemove = _.findWhere(this.availableExtensions, { name: extensionName });
    extensionToRemove.isRegistered = false;
    this.emit("extension-unregistered", extensionToRemove);

    this.beforeRenderListeners.remove(extensionName);
    this.afterRenderListeners.remove(extensionName);
    this.entitySetRegistrationListners.remove(extensionName);

    this._refresh(cb);
};

ExtensionsManager.prototype._findAvailableExtensions = function(cb) {
    logger.info("Searching for available extensions");

    var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = path.join(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        if (S(file).contains("jsreport.config.js"))
                        results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    };

    walk(__dirname, function(err, results) {
        var availableExtensions = results.map(function(configFile) {
            return _.extend({ directory: path.dirname(configFile) }, require(configFile));
        }).sort(function(pa, pb) {
            //todo, sort better by dependencies
            pa.dependencies = pa.dependencies || [];
            pb.dependencies = pb.dependencies || [];

            if (pa.dependencies.length > pb.dependencies.length) return 1;
            if (pa.dependencies.length < pb.dependencies.length) return -1;

            return 0;
        });

        cb(availableExtensions);
    });
};

ExtensionsManager.prototype.collectEntitySets = function(entitySets, cb) {
    this.entitySetRegistrationListners.fire(entitySets, function() {
        cb(entitySets);
    });
};