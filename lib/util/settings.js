/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Key-Value persistent store.
 */ 

var _ = require("underscore");

var Settings = module.exports = function() {
    this._collection = [];
};

Settings.prototype.add = function(key, value) {
    var settingItem = {
        key: key,
        value: value
    };
    this._collection.push(settingItem);
    return this.documentStore.collection("settings").insert(settingItem);
};

Settings.prototype.get = function(key) {
    return _.findWhere(this._collection, { key: key });
};

Settings.prototype.set = function (key, value) {
    this.get(key).value = value;

    return this.documentStore.collection("settings").update({
        key: key
    }, {
        value: value
    });
};

Settings.prototype.init = function (documentStore) {
    this.documentStore = documentStore;
    var self = this;

    return documentStore.collection("settings").find({}).then(function (res) {
        self._collection = res;
    });
};


Settings.prototype.registerEntity = function(documentStore) {
    documentStore.registerEntityType("SettingType", {
        _id: { type: "Edm.String", key: true },
        key: { type: "Edm.String" },
        value: { type: "Edm.String" }
    });

    documentStore.registerEntitySet("settings",  { entityType: "jsreport.SettingType",  shared: true });
};

module.exports = Settings;

