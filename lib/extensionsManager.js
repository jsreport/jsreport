/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * ExtensionsManager responsible for loading, registering and unregistering server extensions.
 */

var events = require("events"),
    util = require("util"),
    utils = require("./util/util.js"),
    fs = require("fs"),
    path = require('path'),
    S = require("string"),
    _ = require("underscore"),
    q = require("q"),
    ListenerCollection = require("./util/listenerCollection.js");

var ExtensionsManager = module.exports = function (reporter, settings, logger, options) {
    var self = this;
    events.EventEmitter.call(this);

    this.availableExtensions = [];
    this.recipes = [];
    this.reporter = reporter;
    this.options = options;
    this.settings = settings;
    this.logger = logger;

    Object.defineProperty(this, "extensions", {
        get: function () {
            return self.availableExtensions.filter(function (e) {
                return e.isRegistered;
            });
        }
    });
};

util.inherits(ExtensionsManager, events.EventEmitter);

ExtensionsManager.prototype.init = function () {
    var self = this;

    return this._findAvailableExtensions().then(function (extensions) {

        extensions.forEach(function (e) {
            e.options = self.options[e.name] || {};
        });
        self.availableExtensions = extensions;

        var extensionsToRegister =  self.options.extensions ?
            self.options.extensions.slice(0) : _.map(extensions, function(e) { return e.name; });

        return self.use(extensionsToRegister).then(function () {
            self.logger.info("Extensions loaded.");
        });
    });
};

ExtensionsManager.prototype._useInternal = function (extension) {
    var self = this;
    this.logger.info("Using extension " + extension);

    try {
        var extensionDefinition = _.findWhere(this.availableExtensions, { name: extension });

        if (!extensionDefinition)
            throw new Error("Extension not found in folder " + this.options.rootDirectory);


        return q().then(function() {
            return require(path.join(extensionDefinition.directory, extensionDefinition.main)).call(self, self.reporter, extensionDefinition);
        }).then(function() {
            extensionDefinition.isRegistered = true;
            self.emit("extension-registered", extensionDefinition);
        });
    }
    catch (e) {
        this.logger.error("Error when loading extension " + extension + require('os').EOL + e.stack);
        return q();
    }
};

ExtensionsManager.prototype.use = function (extension) {
    var self = this;

    if (_.isString(extension)) {
        extension = [extension];
    }

    if (!_.isArray(extension)) {
        extension = [extension];
    }

    return q.all(extension.filter(function(e) {
        return e !== "";
    }).map(function(e) {
        return self._useInternal(e).catch(function(err) {
            self.logger.error("Error when loading extension " + err + require('os').EOL + err.stack);
        });
    }));
};

var _availableExtensionsCache;
ExtensionsManager.prototype._findAvailableExtensions = function () {
    this.logger.info("Searching for available extensions in " + this.options.rootDirectory);

    if (this.options.cacheAvailableExtensions && _availableExtensionsCache) {
        this.logger.info("Loading extensions from cache " + _availableExtensionsCache.length);
        return q(_availableExtensionsCache);
    }

    var self = this;
    return q.nfcall(utils.walk, this.options.rootDirectory, "jsreport.config.js").then(function (results) {
        self.logger.info("Found " + results.length + " extensions");
        var availableExtensions = results.map(function (configFile) {
            return _.extend({ directory: path.dirname(configFile) }, require(configFile));
        }).sort(function (pa, pb) {
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