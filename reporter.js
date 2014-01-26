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
    Q = require("q"),
    Settings = require("./Settings"),
    ExtensionsManager = require("./extensionsManager.js"),
    ListenerCollection = require("./ListenerCollection.js");

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
};

util.inherits(Reporter, events.EventEmitter);

Reporter.prototype.init = function(cb) {
    var self = this;
    //initialize context for standard entities like settings
    this._initializeDataContext(false, function() {
      
          if (!self.options.blobStorage) {//WARN async init
            require("mongodb").MongoClient.connect('mongodb://' + self.options.connectionString.address + ':' + self.options.connectionString.port + '/' + self.options.connectionString.databaseName, {}, function(err, db) {
                self.blobStorage = new(require("./blobStorage/gridFS.js"))(db);
            });
        }
        
        //load all the settings to the memory
        self.settings.init(self.context, function() {
            //initialize all the extensions - this will trigger context reinit
            self.extensionsManager.init(function() {
                //let others to do theirs startup work
                self.initializeListener.fire().then(function() {
                    if (cb != null)
                        cb();
                });
            });
        });
    });
};

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

Reporter.prototype._initializeDataContext = function(withExtensions, done) {
    var self = this;
    var entitySets = {};

    var fn = function() {
        self.settings.createEntitySetDefinitions(entitySets);
        self.contextDefinition = $data.Class.defineEx(self.extendGlobalTypeName("$entity.Context"), [$data.EntityContext, $data.ServiceBase], null, entitySets);

        self.context = new self.contextDefinition(this.connectionString);
        self.context.onReady(function() {

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
            done(self.context);
        });
    };

    if (withExtensions) {
        entitySets = this.extensionsManager.collectEntitySets(entitySets, function() {
            fn.call(self);
        });
    } else {
        fn.call(self);
    }
};

Reporter.prototype.render = function(template, data, options, cb) {
    var self = this;

    if (_.isFunction(options)) {
        cb = options;
        options = null;
    }

    options = this._defaultOptions(options);

    var request = {
        template: template,
        context: this.startContext(),
        data: data,
        options: options,
        reporter: self
    };

    var response = {};

    self.emit("before-render", request, response);
    self.extensionsManager.beforeRenderListeners.fire(request, response)
        .then(function() {
            self.emit("render", request, response);
            return self._executeRecipe(request, response);
        })
        .then(function() {
            self.emit("after-render", request, response);
            return self.extensionsManager.afterRenderListeners.fire(request, response);
        })
        .then(function() {
            return request.context.saveChanges();
        })
        .then(function() {
            cb(null, response);
        }, function(err) { cb(err); });
};

Reporter.prototype._defaultOptions = function(options) {
    options = options || {};

    if (options.timeout == null || options.timeout == 0)
        options.timeout = 5000;

    return options;
};

Reporter.prototype._executeRecipe = function(request, response) {

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