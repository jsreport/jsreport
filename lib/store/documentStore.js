var q = require("q");
var events = require("events");
var util = require("util");

module.exports = DocumentStore = function(options) {
    this._options = options;
    this.model = {
        namespace: "jsreport",
        entityTypes: {},
        complexTypes: {},
        entitySets: {}
    };

    if (this._options.connectionString.name.toLowerCase() === "nedb") {
        this.provider = new (require("./embeddedProvider"))(this.model, this._options);
    }
    if (this._options.connectionString.name.toLowerCase() === "inmemory") {
        this._options.connectionString.inMemory = true;
        this.provider = new (require("./embeddedProvider"))(this.model, this._options);
    }
    if (this._options.connectionString.name.toLowerCase() === "mongodb") {
        this.provider = new (require("./mongoProvider"))(this.model, this._options);
    }

    if (!this.provider)
        throw new Error("Unsupported provider " + this.__options.connectionString.name);
};

util.inherits(DocumentStore, events.EventEmitter);

DocumentStore.prototype.init = function() {
    var self = this;

    this.emit("before-init", this);
    return this.provider.init().then(function() {
        self.emit("after-init", self);
    });
};

DocumentStore.prototype.registerEntityType = function(type, def) {
    this.model.entityTypes[type] = def;
};

DocumentStore.prototype.registerComplexType = function(name, def) {
    this.model.complexTypes[name] = def;
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

DocumentStore.prototype.adaptOData = function(odataServer) {
    return this.provider.adaptOData(odataServer);
};

Object.defineProperty(DocumentStore.prototype, "collections", {
    get: function collections() {
        return this.provider.collections;
    }
});



