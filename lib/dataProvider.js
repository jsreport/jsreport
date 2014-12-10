/*globals $data */

var _ = require("underscore"),
    mongoProvider = require("./jaydata/mongoDBStorageProvider.js"),
    ModelBinder = require("./jaydata/ModelBinder.js"),
    nedbProvider = require("./jaydata/nedbStorageProvider.js"),
    ListenerCollection = require("./util/listenerCollection.js");

$data.EntitySet.prototype.rawUpdate = function(condition, options) {
  return this.entityContext.storageProvider.rawUpdate(this.tableName, condition, options);
};


var DataProvider = module.exports = function(connectionString, options) {
    this.connectionString = connectionString;
    this._entitySets = {};
    this._source = {};
    this.connectionString.source = this._source;
    this.connectionString.persistentData = true;
    this.options = options;

    if (connectionString.name === "neDB") {
        nedbProvider(options.dataDirectory);
    }

    this.connectionString.getLogger = function() { return options.logger; };
};

DataProvider.prototype.buildContext = function() {

    if (this.connectionString.name === "inMemory") {
        //to allow using inMemory provider which stores data in local storage
        global.window.localStorage = {};
        global.window.localStorage.getItem = function (key) {
            return global.window[key];
        };

        global.window.localStorage.setItem = function (key, value) {
            global.window[key] = value;
        };
        /**/
    }

    this.ContextDefinition = $data.Class.defineEx("jsreport.Context", [$data.EntityContext, $data.ServiceBase], null, this._entitySets);
};

DataProvider.prototype.createEntityType = function(name, attributes) {

    if (this.connectionString.name.length === 1) {
        this.connectionString.name = this.connectionString.name[0];
    }

    if (this.connectionString.name === "InMemory" && attributes._id) {
        attributes._id.type = "integer";
        attributes._id.computed = false;
    }

    return $data.Class.define(name, $data.Entity, null, attributes, null);
};

DataProvider.prototype.registerEntitySet = function(name, type, options) {
    var entitySet = { type: $data.EntitySet, elementType: type };
    _.extend(entitySet, options);
    entitySet.tableName = name;

    this._entitySets[name] = entitySet;
    return this._enhanceEntitySet(name, entitySet);
};

DataProvider.prototype.dropStore = function(fn) {
    var droppingConnection = _.extend({}, this.connectionString);
    droppingConnection.dbCreation = $data.storageProviders.DbCreationType.DropAllExistingTables;
    var context = new this.ContextDefinition(droppingConnection);

    if (fn) {
        return context.onReady(fn);
    }

    return context.onReady();
};

DataProvider.prototype.startContext = function(fn) {
    var context = new this.ContextDefinition(this.connectionString);

    var self = this;

    if (fn) {
        return context.onReady(function() {
            fn(context);
        });
    }

    return context.onReady();
};

DataProvider.prototype._enhanceEntitySet = function(name, entitySet) {
    var self = this;
    var methods = ["Update", "Delete", "Create"];

    ["before", "after"].forEach(function(event) {
        methods.forEach(function (m) {
            entitySet[event + m] = function (i) {
                return function (callback, items) {
                    entitySet[event + m + "Listeners"].fire(name, items).then(function (res) {
                        var successes = res.filter(function (r) {
                            return r;
                        });

                        callback(successes.length === res.length);
                    }).catch(function (e) {
                        self.options.logger.error(e.stack);
                    });
                };
            };

            entitySet[event + m + "Listeners"] = new ListenerCollection();
        });
    });

    entitySet.afterRead = function (i) {
        return function (callback, successResult, sets, query) {
            entitySet.afterReadListeners.fire(name, successResult, sets, query).then(function(res) {
                callback();
            }).catch(function(e) {
                self.options.logger.error(e.stack);
            });
        };
    };

    entitySet.afterReadListeners = new ListenerCollection();

    return entitySet;
};