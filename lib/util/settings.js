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
    var settingItem = new this.SettingType({ key: key, value: value });
    this.dataContext.add(settingItem);
    this._collection.push(settingItem);
    return this.dataContext.saveChanges();
};

Settings.prototype.get = function(key) {
    return _.findWhere(this._collection, { key: key });
};

Settings.prototype.set = function (key, value) {
    var self = this;
    this.get(key).value = value;

    return this.dataContext.settings.single(function(s) { return s.key === this.key; }, { key: key }).then(function(res) {
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


Settings.prototype.registerEntity = function(dataProvider) {
    this.SettingType = dataProvider.createEntityType("SettingType", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        key: { type: "string" },
        value: { type: "string" }
    });

    dataProvider.registerEntitySet("settings", this.SettingType, { shared: true });
};

module.exports = Settings;

