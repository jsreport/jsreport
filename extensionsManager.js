/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * ExtensionsManager responsible for loading, registering and unregistering of server extensions.
 */ 

var events = require("events"),
    util = require("util"),
    utils = require("./util.js"),
    fs = require("fs"),
    path = require('path'),
    S = require("string"),
    _ = require("underscore"),
    Q = require("q"),
    ListenerCollection = require("./listenerCollection.js");

module.exports = ExtensionsManager = function(reporter, settings, logger, options) {
    var self = this;
    events.EventEmitter.call(this);

    this.availableExtensions = [];
    this.defaultExtensions = options.extensions.slice(0);
    this.recipes = [];
    this.reporter = reporter;
    this.options = options;
    this.settings = settings;
    this.logger = logger;

    Object.defineProperty(this, "extensions", {
        get: function() {
            return self.availableExtensions.filter(function(e) { return e.isRegistered; });
        }
    });

    this.extensionUnregisteredListeners = new ListenerCollection();
};

util.inherits(ExtensionsManager, events.EventEmitter);

ExtensionsManager.prototype.init = function() {
    var self = this;

    return this._findAvailableExtensions().then(function(extensions) {
        extensions.forEach(function(e) { e.options = self.options[e.name]; });
        self.availableExtensions = extensions;

        self.registrationSetting = self.settings.get("registeredExtensions");

        if (self.registrationSetting == null) {
            self.logger.info("Extension registrations settings was not found. Creating new one");

            return self.settings.add("registeredExtensions", self.defaultExtensions.toString()).then(function() {
                return self.use(self.defaultExtensions).then(function() {
                    self.logger.info("Extensions loaded.");
                });
            });
        } else {
            self.logger.info("Extension registrations settings was found. ");

            self.registrationSetting.value = self.options.loadExtensionsFromPersistedSetting ?
                self.registrationSetting.value : self.defaultExtensions.toString();

            return self.use(self.registrationSetting.value.split(",")).then(function() {
                self.logger.info("Extensions loaded");
            });
        }
    });
};

ExtensionsManager.prototype._useInternal = function(extension) {
    this.logger.info("Using extension " + extension);

    var extensionDefinition = _.findWhere(this.availableExtensions, { name: extension });

    require(path.join(extensionDefinition.directory, extensionDefinition.main)).call(this, this.reporter, extensionDefinition);

    extensionDefinition.isRegistered = true;

    this.emit("extension-registered", extensionDefinition);
};

ExtensionsManager.prototype.use = function(extension) {
    if (extension == "") {
        return Q("");
    }

    var self = this;
    if (!_.isArray(extension))
        extension = [extension];

    extension.forEach(function(e) { self._useInternal(e); });
    return this._refresh();
};

ExtensionsManager.prototype._refresh = function() {
    var registredExtensionsString = this.extensions.map(function(e) { return e.name; }).toString();
    return this.settings.set("registeredExtensions", registredExtensionsString);
};

ExtensionsManager.prototype.unregister = function(extensionName) {

    if (this.options.playgroundMode) {
        throw new Error("Cannot unregiester extensions in playground mode.");
    }

    var extensionToRemove = _.findWhere(this.availableExtensions, { name: extensionName });
    extensionToRemove.isRegistered = false;

    return this.extensionUnregisteredListeners.fire(extensionName).then(function() {
        return this._refresh();
    });
};

var _availableExtensionsCache;
ExtensionsManager.prototype._findAvailableExtensions = function() {
    this.logger.info("Searching for available extensions in " + this.options.rootDirectory);

    if (this.options.cacheAvailableExtensions && _availableExtensionsCache != null) {
        this.logger.info("Loading extensions from cache " + _availableExtensionsCache.length);
        return Q(_availableExtensionsCache);
    }
    
    var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err)self.logger.error(err);
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = path.join(dir, file);
                fs.stat(file, function(err, stat) {
                   if (err)self.logger.error(err);
                    if (stat && stat.isDirectory()) {
                        //ignore cycles in ..jsreport\node_modules\jsreport-import-export\node_modules\jsreport
                        if (S(dir).contains("node_modules") && S(file).endsWith("node_modules")) {
                             if (!--pending) done(null, results);
                        } else {
                            walk(file, function(err, res) {
                             if (err)self.logger.error(err);
                                results = results.concat(res);
                                if (!--pending) done(null, results);
                            });
                        }
                    } else {
                        if (S(file).contains("jsreport.config.js"))
                            results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    };
    var self = this;
    return Q.nfcall(walk, this.options.rootDirectory).then(function(results) {
        self.logger.info("Found " + results.length + " extensions");
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

        _availableExtensionsCache = availableExtensions;
        return availableExtensions;
    });
};