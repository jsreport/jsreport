/*globals $data */

var _ = require("underscore");

var DataProvider = module.exports = function(connectionString, tenant) {
    this.connectionString = connectionString;
    this.tenant = tenant;

    this._entitySets = {};
};

DataProvider.prototype.buildContext = function() {
    this.ContextDefinition = $data.Class.defineEx(this.extendGlobalTypeName("jsreport.Context"),
        [$data.EntityContext, $data.ServiceBase], null, this._entitySets);
};

DataProvider.prototype.createEntityType = function(name, attributes) {
    return $data.Class.define(this.extendGlobalTypeName(name), $data.Entity, null, attributes, null);
};

DataProvider.prototype.registerEntitySet = function(name, type, options) {
    var entitySet = { type: $data.EntitySet, elementType: type };
    _.extend(entitySet, options);

    entitySet.tableName = this.tenant.name === "" ?  name :
        (this.tenant.name + '-' + name);

    this._entitySets[name] = entitySet;
    return entitySet;
};

/* jaydata unfortunately use global variables, we need to use this trick to extend global types with tenant identification
 to prevent collisions */
DataProvider.prototype.extendGlobalTypeName = function (typeName) {
    if (this.tenant.name === "")
        return typeName;

    return this.tenant.name.replace(/-/g, '') + "." + typeName;
};

DataProvider.prototype.startContext = function(fn) {
    var context = new this.ContextDefinition(this.connectionString);

    if (fn) {
        return context.onReady(fn);
    }

    return context.onReady();
};