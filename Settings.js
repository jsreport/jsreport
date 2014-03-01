/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Settings enablik Key-Value persistent store.
 */ 

var _ = require("underscore");

function Settings() {
    this._collection = [];
};

Settings.prototype.add = function(key, value) {
    var settingItem = new $entity.Setting({ key: key, value: value });
    this.dataContext.add(settingItem);
    this._collection.push(settingItem);
    return this.dataContext.saveChanges();
};

Settings.prototype.get = function(key) {
    return _.findWhere(this._collection, { key: key });
};

Settings.prototype.set = function (key, value, cb) {
    var self = this;
    return this.dataContext.settings.single(function(s) { return s.key == this.key; }, { key: key }).then(function(res) {
        self.dataContext.settings.attach(res);
        res.value = value;
        return self.dataContext.saveChanges();
    });
};

Settings.prototype.init = function (dataContext) {
    this.dataContext = dataContext;
    var self = this;
    
    return dataContext.settings.toArray().then(function (res) {
        self._collection = res;
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

