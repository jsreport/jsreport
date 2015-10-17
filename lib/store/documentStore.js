/*!
 * Copyright(c) 2015 Jan Blaha
 *
 * Abstraction over the document/entity storage.
 *
 * It keeps the responsibility for registering entity types into the odata model
 * and also provides a mongo style API into the underlying storage.
 */

var q = require("q");
var events = require("events");
var util = require("util");

var DocumentStore = module.exports = function(options) {
    this._options = options;
    this.model = {
        namespace: "jsreport",
        entityTypes: {},
        complexTypes: {},
        entitySets: {}
    };
};

util.inherits(DocumentStore, events.EventEmitter);

/**
 * Initialize provider underlying
 * @returns {Promise<U>}
 */
DocumentStore.prototype.init = function() {
    var self = this;

    if (!this.provider) {
        if (this._options.connectionString.name.toLowerCase() === "nedb") {
            this.provider = new (require("./embeddedProvider"))(this.model, this._options);
        }
        if (this._options.connectionString.name.toLowerCase() === "inmemory") {
            this._options.connectionString.inMemory = true;
            this.provider = new (require("./embeddedProvider"))(this.model, this._options);
        }
    }

    if (!this.provider)
        throw new Error("Unsupported provider " + this._options.connectionString.name);

    this.emit("before-init", this);
    return this.provider.init().then(function() {
        self.emit("after-init", self);
    });
};

/**
 * Register type for odata.
 * Example:
 * documentStore.registerEntityType("UserType", {
 *       _id: {type: "Edm.String", key: true}
 * });
 *
 * @param {String} type
 * @param {Object} def
 */
DocumentStore.prototype.registerEntityType = function(type, def) {
    this.model.entityTypes[type] = def;
};

DocumentStore.prototype.addFileExtensionResolver = function(fn) {
    if (this.provider.addFileExtensionResolver) {
        this.provider.addFileExtensionResolver(fn);
    }
};


/**
 * Register complex type for odata.
 * Example:
 * documentStore.registerComplexType("DataItemRefType", {
 *       name: {type: "Edm.String" }
 * });
 *
 * @param {String} name
 * @param {Object} def
 */
DocumentStore.prototype.registerComplexType = function(name, def) {
    this.model.complexTypes[name] = def;
};

/**
 * Register complete entity set for odata. The first parameter is then use as a collection name
 * Example:
 * documentStore.registerEntitySet("users", {
 *       entityType: "jsreport.UserType"
 * });
 *
 * @param {String} name
 * @param {Object} def
 */
DocumentStore.prototype.registerEntitySet = function(name, def) {
    this.model.entitySets[name] = def;
};

/**
 * Get the document Collection by the name provided in registerEntitySet
 * @param {String} name
 * @returns {Collection}
 */
DocumentStore.prototype.collection = function(name) {
    return this.provider.collection(name);
};

/**
 * Drop the whole document store
 * @returns {Promise}
 */
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



