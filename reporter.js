/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Reporter main class responsible for rendering process.
 */ 

var winston = require("winston"),
    sformat = require("stringformat"),
    events = require("events"),
    util = require("util"),
    utils = require("./util.js"),
    _ = require("underscore"),
    Readable = require("stream").Readable,
    async = require("async"),
    fs = require("fs"),
    path = require('path'),
    dir = require("node-dir"),
    S = require("string"),
    foo = require("odata-server"),
    fooo = require("./jaydata/mongoDBStorageProvider.js"),
    Q = require("q"),
    Settings = require("./settings.js"),
    ExtensionsManager = require("./extensionsManager.js"),
    ListenerCollection = require("./listenerCollection.js");

function Reporter(options) {
    var self = this;
    var opt = options || {};
    opt.loadExtensionsFromPersistedSettings = opt.loadExtensionsFromPersistedSettings == null ? true : opt.loadExtensionsFromPersistedSettings;
    opt.tenant = opt.tenant || { name: "" };
    this.options = opt;


    this.logger = winston.loggers.get('jsreport') || winston.loggers.add('jsreport');

    events.EventEmitter.call(this);

    this.storageFactory = opt.storageFactory;
    this.blobStorage = opt.blobStorage;
    this.connectionString = opt.connectionString;
    this.extensionsManager = new ExtensionsManager(this, opt);
    this.playgroundMode = opt.playgroundMode || false;

    this.initializeListener = utils.attachLogToListener(new ListenerCollection(), "reporter initialize", self.logger);

    this.settings = new Settings();
}

;

util.inherits(Reporter, events.EventEmitter);

Reporter.prototype.init = function() {
    var self = this;
    //initialize context for standard entities like settings
    return this._initializeDataContext(false).then(function() {

        if (!self.options.blobStorage) {
            self.blobStorage = new(require("./blobStorage/gridFS.js"))(self.options.connectionString);
        }


        //load all the settings to the memory
        return self.settings.init(self.context).then(function() {
            //initialize all the extensions - this will trigger context reinit
            return self.extensionsManager.init().then(function() {
                //let others to do theirs startup work
                return self.initializeListener.fire();
            });
        });
    });
};

/* jaydata unfortunately use global variables, we need to use this trick to extend global types with tenant identification
   to prevent collisions */
Reporter.prototype.extendGlobalTypeName = function(typeName) {
    var nsType = typeName.split(".");
    return nsType[0] + "." + this.options.tenant.name + "." + nsType[1];
};

Reporter.prototype.resetContext = function() {
    this.context = new this.contextDefinition(this.connectionString);
};

Reporter.prototype.startContext = function() {
    return new this.contextDefinition(this.connectionString);
};

Reporter.prototype._initializeDataContext = function(withExtensions) {
    var self = this;
    var entitySets = {};

    var defer = Q.defer();

    var fn = function() {
        self.settings.createEntitySetDefinitions(entitySets);
        self.contextDefinition = $data.Class.defineEx(self.extendGlobalTypeName("$entity.Context"), [$data.EntityContext, $data.ServiceBase], null, entitySets);

        self.context = new self.contextDefinition(this.connectionString);
        self.context.onReady(function() {

            //todo IS this still required?
            self.context.storageProvider.fieldConverter.toDb[self.extendGlobalTypeName("$entity.Script")] = function(e) {
                return e.initData || e;
            };

            self.context.storageProvider.fieldConverter.toDb["$data.Array"] = function(e) {
                if (e == null)
                    return null;

                return e.map(function(item) {
                    return item.initData || item;
                });
            };

            self.emit("context-ready");
            defer.resolve(self.context);
        });
    };

    if (withExtensions) {
        this.extensionsManager.collectEntitySets(entitySets).then(function() {
            fn.call(self);
        });
    } else {
        fn.call(self);
    }

    return defer.promise;
};

Reporter.prototype.render = function(request) {
    var self = this;

    request.options = this._defaultOptions(request.options);
    request.context = this.startContext();
    request.reporter = self;

    var response = {
        headers: {}
    };

    self.emit("before-render", request, response);
    return self.extensionsManager.beforeRenderListeners.fire(request, response)
        .then(function() {
            self.emit("render", request, response);
            return self.executeRecipe(request, response);
        })
        .then(function() {
            self.emit("after-render", request, response);
            return self.extensionsManager.afterRenderListeners.fire(request, response);
        })
        .then(function() {
            return request.context.saveChanges().then(function() { return response; });
        });
};

Reporter.prototype._defaultOptions = function(options) {
    options = options || {};

    if (options.timeout == null || options.timeout == 0)
        options.timeout = 30000;

    return options;
};

Reporter.prototype.executeRecipe = function(request, response) {

    var recipe = _.findWhere(this.extensionsManager.recipes, { name: request.template.recipe });

    if (recipe == null)
        return Q.reject("Recipe " + request.template.recipe + " was not found.");


    return recipe.execute(request, response);
};

Reporter.prototype.getEngines = function(cb) {
    fs.readdir(path.join(__dirname, "render"), function(err, files) {
        if (err)
            return cb(err);

        var engines = _.filter(files, function(f) {
            return S(f).endsWith("Engine.js");
        });

        cb(null, _.map(engines, function(e) {
            return e.substring(0, e.length - "Engine.js".length);
        }));
    });
};

module.exports = Reporter;