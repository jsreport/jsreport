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
    foo = require("odata-server"),
    mongoProvider = require("./jaydata/mongoDBStorageProvider.js"),
    nedbProvider = require("./jaydata/nedbStorageProvider.js"),
    TaskManager = require("./tasks/taskManager.js"),
    Q = require("q"),
    FS = require("q-io/fs"),
    Settings = require("./util/settings.js"),
    ExtensionsManager = require("./extensionsManager.js"),
    render = require("./render/render.js"),
    ListenerCollection = require("./util/listenerCollection.js");

var taskManager;

function Reporter(options) {
    var self = this;
    var opt = options || {};
    opt.loadExtensionsFromPersistedSettings = opt.loadExtensionsFromPersistedSettings == null ? true : opt.loadExtensionsFromPersistedSettings;
    opt.tenant = opt.tenant || { name: "" };
    opt.DataProvider = opt.DataProvider || require("./dataProvider.js");
    this.options = opt;

    this.logger = this.options.logger || new (require("./util/consoleLogger.js"))();

    events.EventEmitter.call(this);

    this.blobStorage = opt.blobStorage;

    this.initializeListener = utils.attachLogToListener(new ListenerCollection(), "reporter initialize", self.logger);
    this.beforeRenderListeners = utils.attachLogToListener(new ListenerCollection(), "before render", self.logger);
    this.afterRenderListeners = utils.attachLogToListener(new ListenerCollection(), "after render", self.logger);
    this.dataProvider = new opt.DataProvider(this.options.connectionString, this.options);
    this.settings = new Settings();
    this.extensionsManager = new ExtensionsManager(this, this.settings, this.logger, opt);

    if (!taskManager) {
        taskManager = new TaskManager(this.options.tasks);
    }
    this.taskManager = taskManager;
}

util.inherits(Reporter, events.EventEmitter);

Reporter.prototype.init = function () {
    var self = this;

    //first initialize data context for settings, so we now what extensions should we load
    this.settings.registerEntity(this.dataProvider);
    this.dataProvider.buildContext();

    return taskManager.ensureStarted().then(function () {
        return self.dataProvider.startContext();
    }).then(function (context) {
        return self.settings.init(context);
    }).then(function () {
        if (self.options.blobStorage === "fileSystem") {
            self.blobStorage = new (require("./blobStorage/fileSystem.js"))();
        } else {
            self.blobStorage = new (require("./blobStorage/gridFS.js"))(self.options.connectionString);
        }

        //initialize all the extensions
        return self.extensionsManager.init().then(function () {
            //initialize context again with all extensions
            self.dataProvider.buildContext();

            //let others to do theirs startup work
            return self.initializeListener.fire().then(function () {
                self.logger.info("reporter initialized");
            });
        });
    }).fail(function (e) {
        self.logger.error("Error occured during reporter init " + e.stack);
        return e;
    });
};

Reporter.prototype.render = function (request) {
    this.logger.info("Starting rendering request");
    var self = this;

    request.options = request.options || {};

    request.reporter = self;

    var response = {
        headers: {}
    };

    return this.dataProvider.startContext().then(function (context) {
        request.context = context;
        self.emit("before-render", request, response);
    }).then(function () {
        if (_.isString(request.data)) {
            request.data = JSON.parse(request.data.toString());
        }
    }).then(function () {
        return self.beforeRenderListeners.fire(request, response);
    }).then(function () {
        self.emit("render", request, response);
        return self.executeRecipe(request, response);
    }).then(function () {
        self.emit("after-render", request, response);
        return self.afterRenderListeners.fire(request, response);
    }).then(function () {
        return request.context.saveChanges().then(function () {
            self.logger.info("Rendering request finished");
            return response;
        });
    }).fail(function (e) {
        var logFn = e.weak ? self.logger.warn : self.logger.error;
        logFn("Error when processing render request " + e.message + " " + e.stack);
        return Q.reject(e);
    });

};

Reporter.prototype.executeRecipe = function (request, response) {

    var recipe = _.findWhere(this.extensionsManager.recipes, { name: request.template.recipe });

    if (recipe === null)
        return Q.reject("Recipe " + request.template.recipe + " was not found.");


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
    request.taskManager = this.taskManager;
    return render(request, response).fail(function (e) {
        e.weak = true;
        return Q.reject(e);
    });
};

module.exports = Reporter;