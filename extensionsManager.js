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
    ListenerCollection = require("./ListenerCollection.js");

module.exports = ExtensionsManager = function(reporter, options) {
    var self = this;
    events.EventEmitter.call(this);

    this.availableExtensions = [];
    this.defaultExtensions = options.extensions.slice(0);
    this.recipes = [];
    this.reporter = reporter;
    this.options = options;

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

ExtensionsManager.prototype.init = function() {
    var self = this;

    return this._findAvailableExtensions().then(function(extensions) {
        extensions.forEach(function(e) { e.options = self.options[e.name]; });
        self.availableExtensions = extensions;

        self.registrationSetting = self.reporter.settings.get("registeredExtensions");

        if (self.registrationSetting == null) {
            self.reporter.logger.info("Extension registrations settings was not found. Creating new one");

            return self.reporter.settings.add("registeredExtensions", self.defaultExtensions.toString()).then(function() {
                return self.use(self.defaultExtensions).then(function() {
                    self.reporter.logger.info("Extensions loaded.");
                });
            });
        } else {
            self.reporter.logger.info("Extension registrations settings was found. ");

            self.registrationSetting.value = self.reporter.loadExtensionsFromPersistedSetting ?
                self.registrationSetting.value : self.defaultExtensions.toString();

            return self.use(self.registrationSetting.value.split(",")).then(function() {
                self.reporter.logger.info("Extensions loaded");
            });
        }
    });
};

ExtensionsManager.prototype._useInternal = function(extension) {
    this.reporter.logger.info("Using extension " + extension);

    var extensionDefinition = _.findWhere(this.availableExtensions, { name: extension });
    require(path.join(extensionDefinition.directory, extensionDefinition.main)).call(this, this.reporter, extensionDefinition);

    extensionDefinition.isRegistered = true;

    this.emit("extension-registered", extensionDefinition);
};

ExtensionsManager.prototype.use = function(extension) {
    var self = this;
    if (!_.isArray(extension))
        extension = [extension];

    extension.forEach(function(e) { self._useInternal(e); });
    return this._refresh();
};

ExtensionsManager.prototype._refresh = function() {
    var self = this;

    var registredExtensionsString = this.extensions.map(function(e) { return e.name; }).toString();
    return this.reporter.settings.set("registeredExtensions", registredExtensionsString).then(function() {
        return self.reporter._initializeDataContext(true);
    });
};

ExtensionsManager.prototype.unregister = function(extensionName) {

    if (this.reporter.playgroundMode) {
        throw new Error("Cannot unregiester extensions in playground mode.");
    }

    var extensionToRemove = _.findWhere(this.availableExtensions, { name: extensionName });
    extensionToRemove.isRegistered = false;
    this.emit("extension-unregistered", extensionToRemove);

    this.beforeRenderListeners.remove(extensionName);
    this.afterRenderListeners.remove(extensionName);
    this.entitySetRegistrationListners.remove(extensionName);

    return this._refresh();
};

ExtensionsManager.prototype._findAvailableExtensions = function() {
    this.reporter.logger.info("Searching for available extensions");

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

    return Q.nfcall(walk, __dirname).then(function(results) {
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

        return availableExtensions;
    });
};

ExtensionsManager.prototype.collectEntitySets = function(entitySets) {
    return this.entitySetRegistrationListners.fire(entitySets);
};