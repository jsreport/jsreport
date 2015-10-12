/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Reporter main class responsible for rendering process.
 */

var events = require("events"),
    util = require("util"),
    utils = require("./util/util.js"),
    _ = require("underscore"),
    fs = require("fs"),
    path = require('path'),
    S = require("string"),
    DocumentStore = require("./store/documentStore.js"),
    q = require("q"),
    Settings = require("./util/settings.js"),
    ExtensionsManager = require("./extensionsManager.js"),
    blobStorageFactory = require("./blobStorage/blobStorageFactory.js"),
    ListenerCollection = require("listener-collection");

var reportCounter = 0;

function Reporter(options) {
    var self = this;
    var opt = options || {};
    opt.loadExtensionsFromPersistedSettings = opt.loadExtensionsFromPersistedSettings == null ? true : opt.loadExtensionsFromPersistedSettings;
    opt.tenant = opt.tenant || {name: ""};
    this.options = opt;

    this.options.logger = this.logger = this.options.logger || new (require("./util/consoleLogger.js"))();

    events.EventEmitter.call(this);

    this.documentStore = new DocumentStore(this.options);
    this.settings = new Settings();

    //temporary back compatibility sollution adding jsrender and handlebars
    if (this.options.extensions) {
        if (!_.contains(this.options.extensions, "jsrender")) {
            this.options.extensions.push("jsrender");
        }
        if (!_.contains(this.options.extensions, "handlebars")) {
            this.options.extensions.push("handlebars");
        }
    }

    this.extensionsManager = new ExtensionsManager(this, this.settings, this.logger, this.options);
    Reporter.instance = this;
    this.version = require(path.join(__dirname, "../", "package.json")).version;
}

util.inherits(Reporter, events.EventEmitter);

Reporter.prototype.init = function () {
    var self = this;

    this.initializeListener = new ListenerCollection();
    this.beforeRenderListeners = new ListenerCollection();
    this.afterRenderListeners = new ListenerCollection();
    this.afterTemplatingEnginesExecutedListeners = new ListenerCollection();
    this.validateRenderListeners = new ListenerCollection();

    this.options.phantom = this.options.phantom || {};
    this.options.tasks = this.options.tasks || {};

    if (!this.options.phantom.strategy && !this.options.tasks.strategy) {
        this.logger.info("Setting process based strategy for rendering. Please visit http://jsreport.net/learn/configuration for information how to get more performance.");
    }

    this.options.phantom.strategy = this.options.phantom.strategy ||  "dedicated-process";
    this.options.tasks.strategy = this.options.tasks.strategy ||  "dedicated-process";

    this.options.tasks.tempDirectory = this.options.tempDirectory;
    this.options.tasks.nativeModules = [{ globalVariableName: "_", module: "underscore" }, { globalVariableName: "moment", module: "moment" }];
    this.toner = require("toner")(this.options.tasks);
    this.scriptManager = this.toner.scriptManager;

    this._bindTonerListeners();

    return this._init().then(function () {
        self.emit("before-init");
        return self.initializeListener.fire().then(function () {
            self._useRecipesInToner();
            self._useEnginesInToner();
            self.logger.info("reporter initialized");
            return self;
        });
    }).fail(function (e) {
        self.logger.error("Error occured during reporter init " + e.stack);
        return q.reject(e);
    });
};

Reporter.prototype._init = function () {
    var self = this;

    this.settings.registerEntity(this.documentStore);

    return q.ninvoke(this.toner.scriptManager, "ensureStarted").then(function () {
        return self.extensionsManager.init();
    }).then(function() {
        return self.documentStore.init();
    }).then(function() {
        self.blobStorage = blobStorageFactory(self);
    }).then(function() {
        return self.settings.init(self.documentStore);
    }).fail(function (e) {
       self.logger.error("Error occured during reporter init " + e.stack);
          return q.reject(e);
    });
};

Reporter.prototype.createListenerCollection = function () {
    return new ListenerCollection();
};

Reporter.prototype._bindTonerListeners = function () {

    function toCb(promise, cb) {
        q.when(promise).then(function() { cb();}).catch(function(e) { cb(e); });
    }

    var self = this;
    this.toner.before(function(req, res, cb) {
        var prom = self.beforeRenderListeners.fire(req, res).then(function() {
            return self.validateRenderListeners.fire(req, res);
        });

        toCb(prom, cb);
    });
    this.toner.after(function(req, res, cb) {
        toCb(self.afterRenderListeners.fire(req, res), cb);
    });
    this.toner.afterEngine(function(req, res, cb) {
        toCb(self.afterTemplatingEnginesExecutedListeners.fire(req, res), cb);
    });
};

Reporter.prototype._useRecipesInToner = function () {
    var self = this;
    this.extensionsManager.recipes.forEach(function(recipe) {
        self.toner.recipe(recipe.name, function(req, res, cb) {
            q.when(recipe.execute(req, res)).then(function(){
                cb();
            }).catch(function(e) { cb(e);});
        });
    });
};

Reporter.prototype._useEnginesInToner = function () {
    var self = this;

    this.extensionsManager.engines.forEach(function(engine) {
        self.toner.engine(engine.name, engine.pathToEngine);
    });
};

Reporter.prototype.render = function (request) {

    if (_.isString(request)) {
        request = {
            template: {content: request}
        };
    }

    if (!request.template) {
        return q.reject(new Error("template property must be defined."));
    }

    if (!request.template.shortid) {
        request.template.recipe = request.template.recipe || "phantom-pdf";
        request.template.engine = request.template.engine || "handlebars";
    }

    request.reportCounter = ++reportCounter;
    request.startTime = new Date();
    this.logger.info("Starting rendering request " + reportCounter + " (user: " + (request.user ? request.user.username : "null") + ")");
    var self = this;

    request.options = request.options || {};

    request.reporter = self;

    if (_.isString(request.data)) {
        try {
            request.data = JSON.parse(request.data.toString());
        }
        catch (e) {
        }
    }

    return q.ninvoke(this.toner, "render", request).then(function (response) {
        self.logger.info("Rendering request " + request.reportCounter + " finished in " + (new Date() - request.startTime) + " ms");
        response.result = response.stream;
        return response;
    }).catch(function (e) {
        e.message = "Error during rendering report: " + e.message;
        var logFn = e.weak ? self.logger.warn : self.logger.error;
        logFn("Error when processing render request " + e.message + " " + e.stack);
        throw e;
    });
};

module.exports = Reporter;