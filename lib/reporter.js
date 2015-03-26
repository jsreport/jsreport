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
    ScriptManager = require("script-manager").ScriptManager,
    DocumentStore = require("./store/documentStore.js"),
    q = require("q"),
    FS = require("q-io/fs"),
    Settings = require("./util/settings.js"),
    ExtensionsManager = require("./extensionsManager.js"),
    render = require("./render/render.js"),
    blobStorageFactory = require("./blobStorage/blobStorageFactory.js"),
    ListenerCollection = require("./util/listenerCollection.js"),
    streamifier = require("streamifier");

var scriptManager;
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
    this.blobStorage = blobStorageFactory(this.options);
    this.settings = new Settings();
    this.extensionsManager = new ExtensionsManager(this, this.settings, this.logger, opt);
    if (!scriptManager) {
        scriptManager = new ScriptManager(this.options.tasks);
    }
    this.scriptManager = scriptManager;
    Reporter.instance = this;
}

util.inherits(Reporter, events.EventEmitter);

Reporter.prototype.init = function () {
    var self = this;

    this.initializeListener = new ListenerCollection();
    this.beforeRenderListeners = new ListenerCollection();
    this.afterRenderListeners = new ListenerCollection();
    this.afterTemplatingEnginesExecutedListeners = new ListenerCollection();
    this.validateRenderListeners = new ListenerCollection();

    return this._init().then(function () {
        return self.initializeListener.fire().then(function () {
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

    //first initialize data context for settings, so we now what extensions should we load
    this.settings.registerEntity(this.documentStore);

    return q.ninvoke(scriptManager, "ensureStarted").then(function () {
        return self.documentStore.init();
    }).then(function () {
        return self.settings.init(self.documentStore);
    }).then(function () {
        //initialize all the extensions
        return self.extensionsManager.init().then(function () {
            //initialize context again with all extensions
            return self.documentStore.init();
        });
    }).fail(function (e) {
        self.logger.error("Error occured during reporter init " + e.stack);
        return q.reject(e);
    });
};

Reporter.prototype.createListenerCollection = function () {
    return new ListenerCollection();
};

Reporter.prototype.render = function (request) {
    if (_.isString(request)) {
        request = {
            template: {content: request}
        };
    }

    if (!request.template.shortid)
        request.template.recipe = request.template.recipe || "phantom-pdf";

    request.reportCounter = ++reportCounter;
    request.startTime = new Date();
    this.logger.info("Starting rendering request " + reportCounter + " (user: " + (request.user ? request.user.username : "null") + ")");
    var self = this;

    request.options = request.options || {};

    request.reporter = self;

    var response = {
        headers: {}
    };

    return q().then(function (context) {
        self.emit("before-render", request, response);
    }).then(function () {
        if (_.isString(request.data)) {
            try {
                request.data = JSON.parse(request.data.toString());
            }
            catch (e) {
            }
        }
    }).then(function () {
        return self.beforeRenderListeners.fire(request, response);
    }).then(function () {
        return self.validateRenderListeners.fire(request, response);
    }).then(function () {
        self.emit("render", request, response);
        return self.executeRecipe(request, response);
    }).then(function () {
        self.emit("after-render", request, response);
        return self.afterRenderListeners.fire(request, response);
    }).then(function () {
        self.logger.info("Rendering request " + request.reportCounter + " finished in " + (new Date() - request.startTime) + " ms");

        if (typeof response.result !== "string")
            response.result = streamifier.createReadStream(response.result);

        return response;
    }).catch(function (e) {
        e.message = "Error during rendering report: " + e.message;
        var logFn = e.weak ? self.logger.warn : self.logger.error;
        logFn("Error when processing render request " + e.message + " " + e.stack);
        throw e;
    });
};

Reporter.prototype.executeRecipe = function (request, response) {

    var recipe = _.findWhere(this.extensionsManager.recipes, {name: request.template.recipe});

    if (!recipe)
        return q.reject(new Error("Recipe " + request.template.recipe + " was not found."));

    return recipe.execute(request, response);
};

Reporter.prototype.getEngines = function (cb) {
    return FS.list(path.join(__dirname, "render")).then(function (files) {
        var engines = _.filter(files, function (f) {
            return S(f).endsWith("Engine.js");
        });

        return _.map(engines, function (e) {
            return e.substring(0, e.length - "Engine.js".length);
        });
    });
};

Reporter.prototype.renderContent = function (request, response) {
    var self = this;
    request.scriptManager = this.scriptManager;
    return render(request, response).then(function () {
        return self.afterTemplatingEnginesExecutedListeners.fire(request, response);
    }).fail(function (e) {
        e.weak = true;
        return q.reject(e);
    });
};

module.exports = Reporter;