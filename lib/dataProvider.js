/*globals $data */

var _ = require("underscore"),
    mongoProvider = require("./jaydata/mongoDBStorageProvider.js"),
    nedbProvider = require("./jaydata/nedbStorageProvider.js");

var DataProvider = module.exports = function(connectionString, options) {
    this.connectionString = connectionString;
    this._entitySets = {};
    this._source = {};
    this.connectionString.source = this._source;
    this.connectionString.persistentData = true;

    if (connectionString.name == "neDB") {
        nedbProvider(options.dataDirectory);
    }

    this.connectionString.logger = options.logger;
};

DataProvider.prototype.buildContext = function() {
    global.window.localStorage = {};
    global.window.localStorage.getItem = function(key) {
        return global.window[key];
    }

    global.window.localStorage.setItem = function(key, value) {
        global.window[key] = value;;
    }

    this.ContextDefinition = $data.Class.defineEx("jsreport.Context", [$data.EntityContext, $data.ServiceBase], null, this._entitySets);
};

DataProvider.prototype.createEntityType = function(name, attributes) {

    if (this.connectionString.name == "InMemory" && attributes._id) {
        attributes._id.type = "integer";
    }

    return $data.Class.define(name, $data.Entity, null, attributes, null);
};

DataProvider.prototype.registerEntitySet = function(name, type, options) {
    var entitySet = { type: $data.EntitySet, elementType: type };
    _.extend(entitySet, options);
    entitySet.tableName = name;
    this._entitySets[name] = entitySet;
    return entitySet;
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