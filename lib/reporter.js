/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Reporter main class responsible for rendering process.
 */ 

var winston = require("winston"),
    events = require("events"),
    util = require("util"),
    utils = require("./util/util.js"),
    _ = require("underscore"),
    fs = require("fs"),
    path = require('path'),
    S = require("string"),
    foo = require("odata-server"),
    mongoProvider = require("./jaydata/mongoDBStorageProvider.js"),
    nedbProvider = require("./jaydata/nedbStorageProvider.js"),
    Q = require("q"),
    dataParser = require("./util/dataParser.js"),
    Settings = require("./util/settings.js"),
    ExtensionsManager = require("./extensionsManager.js"),
    renderContent = require("./render/render.js"),
    ListenerCollection = require("./util/listenerCollection.js");

function Reporter(options) {
    var self = this;
    var opt = options || {};
    
    this.logger = winston.loggers.get('jsreport') || winston.loggers.add('jsreport');
    
    if (opt.tenant != null && !this.logger._enhanced) {
        this.logger._enhanced = true;
        
        var methods = ["info", "warn", "error", "debug"];
        methods.forEach(function(m) {
            var originalMethod = self.logger[m];
            self.logger[m] = function(message) {
                originalMethod(opt.tenant.name + " " + message);
            };
        });
    }
    
    opt.loadExtensionsFromPersistedSettings = opt.loadExtensionsFromPersistedSettings == null ? true : opt.loadExtensionsFromPersistedSettings;
    opt.tenant = opt.tenant || { name: "" };
    opt.rootDirectory = opt.rootDirectory || path.join(__dirname, "../");
    this.options = opt;

    events.EventEmitter.call(this);

    this.blobStorage = opt.blobStorage;
    this.connectionString = opt.connectionString;

    this.initializeListener = utils.attachLogToListener(new ListenerCollection(), "reporter initialize", self.logger);
    this.beforeRenderListeners = utils.attachLogToListener(new ListenerCollection(), "before render", self.logger);
    this.afterRenderListeners = utils.attachLogToListener(new ListenerCollection(), "after render", self.logger);
    this.entitySetRegistrationListners = utils.attachLogToListener(new ListenerCollection(), "entitySet registration", self.logger);

    this.settings = new Settings();
    this.extensionsManager = new ExtensionsManager(this, this.settings, this.logger, opt);
    this.extensionsManager.extensionUnregisteredListeners.add(function(extensionName) {
        self.beforeRenderListeners.remove(extensionName);
        self.afterRenderListeners.remove(extensionName);
        self.entitySetRegistrationListners.remove(extensionName);
    });
}

util.inherits(Reporter, events.EventEmitter);

Reporter.prototype.init = function() {
    var self = this;
    //initialize context for standard entities like settings
    return this._initializeDataContext(false).then(function() {

        if (self.options.blobStorage === "fileSystem") {
            self.blobStorage = new (require("./blobStorage/fileSystem.js"))();
        } else {
            self.blobStorage = new(require("./blobStorage/gridFS.js"))(self.options.connectionString);
        }

        //load all the settings to the memory
        return self.settings.init(self.context).then(function() {
            //initialize all the extensions
            return self.extensionsManager.init().then(function() {
                //initialize context again with all extensions
                return self._initializeDataContext(true).then(function() {
                    //let others to do theirs startup work
                    return self.initializeListener.fire().then(function() {
                        self.logger.info("reporter initialized");
                    });
                });
            });
        }).fail(function(e) {
            self.logger.error("Error occured during reporter init " + e.stack);
            return e;
        });
    });
};

/* jaydata unfortunately use global variables, we need to use this trick to extend global types with tenant identification
   to prevent collisions */
Reporter.prototype.extendGlobalTypeName = function(typeName) {
    var nsType = typeName.split(".");
    return nsType[0] + "." + this.options.tenant.name.replace(/-/g, '') + "." + nsType[1];
};

Reporter.prototype.startContext = function() {
    var context = new this.contextDefinition(this.connectionString);
    return context;
};

Reporter.prototype._initializeDataContext = function(withExtensions) {
    var self = this;
    var entitySets = {};

    var fn = function(cb) {

        self.settings.createEntitySetDefinitions(entitySets);
        
        for (var property in entitySets) {
            if (entitySets.hasOwnProperty(property)) {
                entitySets[property].tableName = self.options.tenant.name == "" ?  property : 
                    (self.options.tenant.name + '-' + property);
            }
        }

        self.contextDefinition = $data.Class.defineEx(self.extendGlobalTypeName("$entity.Context"),
            [$data.EntityContext, $data.ServiceBase], null, entitySets);

        self.originalEntitySets = entitySets;

        self.context = self.startContext();
        self.context.onReady().then(function() {
            self.context.storageProvider.fieldConverter.toDb["$data.Array"] = function(e) {
                if (e == null)
                    return null;

                return e.map(function(item) {
                    return item.initData || item;
                });
            };

            self.emit("context-ready");
            cb(null, self.context);
        });
    };

    if (!withExtensions)
        return Q.nfcall(fn);

    return this.entitySetRegistrationListners.fire(entitySets).then(function() { return Q.nfcall(fn); });

};

Reporter.prototype.render = function(request) {
    var self = this;

    request.options = request.options || {};

    if (!request.options.timeout)
        request.options.timeout = 30000;

    request.context = this.startContext();
    request.reporter = self;

    var response = {
        headers: {}
    };

    self.emit("before-render", request, response);
    return dataParser(request).then(function() {
        return self.beforeRenderListeners.fire(request, response);
    })
        .then(function() {
            self.emit("render", request, response);
            return self.executeRecipe(request, response);
        })
        .then(function() {
            self.emit("after-render", request, response);
            return self.afterRenderListeners.fire(request, response);
        })
        .then(function() {
            return request.context.saveChanges().then(function() { return response; });
        }).fail(function(e) {
            var logFn = e.weak ? self.logger.warn : self.logger.error;
            logFn("Error when processing render request " + e.message + " " + e.stack);
            return Q.reject(e);
        });
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

Reporter.prototype.renderContent = function(request, response) {
    return Q.nfcall(renderContent, request, response).fail(function(e) {
          e.weak = true;
          return Q.reject(e);
    });
};

module.exports = Reporter;