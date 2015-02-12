var q = require("q");
var odataServer = require("odata-server");

module.exports = DocumentStore = function(connectionString, options) {
    this._connectionString = connectionString;
    this._options = options;
    this.model = {
        namespace: "jsreport",
        entityTypes: {},
        complexType: {},
        entitySets: {}
    };
}

DocumentStore.prototype.init = function() {
    if (this._connectionString.name === "neDB") {
        this.provider = new (require("./embeddedProvider"))(this.model, this._options);
        return this.provider.init();
    }
}

DocumentStore.prototype.registerEntityType = function(type, def) {
    this.model.entityTypes[type] = def;
}

DocumentStore.prototype.registerComplexType = function(name, def) {
    this.model.complexType[name] = def;
}

DocumentStore.prototype.registerEntitySet = function(name, def) {
    def.entityType = "jsreport." + def.entityType;
    this.model.entitySets[name] = def;
}

DocumentStore.prototype.createODataAdapter = function() {
    this.provider.createODataAdapter();
}

DocumentStore.prototype.collection = function(name) {
    return this.provider.collection(name);
}



