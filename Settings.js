/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var winston = require("winston"),
    sformat = require("stringformat"),
    events = require("events"),
    util = require("util"),
    _ = require("underscore"),
    Readable = require("stream").Readable,
    async = require("async"),
    fs = require("fs"),
    path = require('path'),
    dir = require("node-dir"),
    S = require("string"),
    foo = require("odata-server"),
    ExtensionsManager = require("./extensionsManager.js");

var logger = winston.loggers.get('jsreport');

function Settings() {
    this._collection = [];
    events.EventEmitter.call(this);
};

util.inherits(Settings, events.EventEmitter);

Settings.prototype.add = function(key, value, cb) {
    var settingItem = new $entity.Setting({ key: key, value: value });
    this.dataContext.add(settingItem);
    this._collection.push(settingItem);
    this.dataContext.saveChanges().then(cb);
};

Settings.prototype.get = function(key) {
    return _.findWhere(this._collection, { key: key });
};

Settings.prototype.set = function (key, value, cb) {
    var self = this;
    this.dataContext.settings.single(function(s) { return s.key == this.key; }, { key: key }, function(res) {
        self.dataContext.settings.attach(res);
        res.value = value;
        self.dataContext.saveChanges().then(function() {
            cb();
        });
    });
};

Settings.prototype.init = function (dataContext, cb) {
    this.dataContext = dataContext;
    var self = this;
    
    dataContext.settings.toArray().then(function (res) {
        self._collection = res;
        cb();
    });
};


Settings.prototype.createEntitySetDefinitions = function(entitySets) {
    $data.Class.define("$entity.Setting", $data.Entity, null, {
        _id: { type: "id", key: true, computed: true, nullable: false },
        key: { type: "string" },
        value: { type: "string" },
    }, null);


    entitySets["settings"] = { type: $data.EntitySet, elementType: $entity.Setting };
};

module.exports = Settings;

