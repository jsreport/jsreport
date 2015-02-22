var q = require("q");
var events = require("events");
var util = require("util");

module.exports = DocumentStore = function(connectionString, options) {
    this._connectionString = connectionString;
    this._options = options;
    this.model = {
        namespace: "jsreport",
        entityTypes: {},
        complexType: {},
        entitySets: {}
    };
};

util.inherits(DocumentStore, events.EventEmitter);

DocumentStore.prototype.init = function() {
    var self = this;

    if (this._connectionString.name.toLowerCase() === "nedb") {
        this.provider = new (require("./embeddedProvider"))(this.model, this._options);
    }
    if (this._connectionString.name.toLowerCase() === "inmemory") {
        this.provider = new (require("./inMemoryProvider"))(this.model, this._options);
    }

    if (!this.provider)
        throw new Error("Unsupported provider " + this._connectionString.name);

    this.emit("before-init", this);
    return this.provider.init().then(function() {
        self.emit("after-init", self);
    });
};

DocumentStore.prototype.registerEntityType = function(type, def) {
    this.model.entityTypes[type] = def;
};

DocumentStore.prototype.registerComplexType = function(name, def) {
    this.model.complexType[name] = def;
};

DocumentStore.prototype.registerEntitySet = function(name, def) {
    def.type = def.entityType;
    def.entityType = "jsreport." + def.entityType;
    this.model.entitySets[name] = def;
};

DocumentStore.prototype.createODataAdapter = function() {
    this.provider.createODataAdapter();
};

DocumentStore.prototype.collection = function(name) {
    return this.provider.collection(name);
};

DocumentStore.prototype.drop = function() {
    return this.provider.drop();
};

Object.defineProperty(DocumentStore.prototype, "collections", {
    get: function collections() {
        return this.provider.collections;
    }
});



