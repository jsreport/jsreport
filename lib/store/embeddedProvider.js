var q = require("q");
var Datastore = require("nedb");
var path = require("path");

module.exports = EmbeddedProvider = function(model, options) {
    this._model = model;
    this._options = options;
    this._collections = {};
}

EmbeddedProvider.prototype.init = function() {
    var self = this;

    var promises = Object.keys(this._model.entitySets).map(function(key) {
        var col = new EmbeddedCollection(key, self._options);
        self._collections[key] = col;
        return col.load();
    });

    return q.all(promises);
}

EmbeddedProvider.prototype.collection = function(name) {
    return this._collections[name];
}

EmbeddedProvider.prototype.createODataAdapter = function() {

}

function EmbeddedCollection(name, options) {
    this._name = name;
    this._options = options;
}

EmbeddedCollection.prototype.load = function() {
    this._db = new Datastore({filename: path.join(this._options.dataDirectory, this._name), autoload: false});
    return q.ninvoke(this._db, "loadDatabase");
}

EmbeddedCollection.prototype.find = function(query) {
    return q.ninvoke(this._db, "find", query);
}

EmbeddedCollection.prototype.insert = function(doc) {
    return q.ninvoke(this._db, "insert", doc);
}

EmbeddedCollection.prototype.update = function(query, update) {
    return q.ninvoke(this._db, "update", query, update);
}

