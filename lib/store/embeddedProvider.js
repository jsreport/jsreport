var q = require("q");
var Datastore = require("nedb");
var path = require("path");
var ListenerCollection = require("../util/listenerCollection.js");

var EmbeddedProvider = module.exports = function (model, options) {
    this._model = model;
    this._options = options;
    this._collections = {};
};

EmbeddedProvider.prototype.init = function () {
    var self = this;

    var promises = Object.keys(this._model.entitySets).map(function (key) {
        var col = new EmbeddedCollection(key, self._options);
        self._collections[key] = col;
        return col.load();
    });

    return q.all(promises);
};

EmbeddedProvider.prototype.collection = function (name) {
    return this._collections[name];
};

function EmbeddedCollection(name, options) {
    this._name = name;
    this._options = options;
    this.beforeUpdateListeners = new ListenerCollection();
    this.beforeInsertListeners = new ListenerCollection();
}

EmbeddedCollection.prototype.load = function () {
    this._db = new Datastore({filename: path.join(this._options.dataDirectory, this._name), autoload: false});
    return q.ninvoke(this._db, "loadDatabase");
};

EmbeddedCollection.prototype.find = function (query) {
    return q.ninvoke(this._db, "find", query);
};

EmbeddedCollection.prototype.count = function (query) {
    return q.ninvoke(this._db, "count", query);
};

EmbeddedCollection.prototype.insert = function (doc) {
    var self = this;
    return this.beforeInsertListeners.fire(doc).then(function () {
        return q.ninvoke(self._db, "insert", doc);
    });
};

EmbeddedCollection.prototype.update = function (query, update) {
    var self = this;
    return this.beforeUpdateListeners.fire(query, update).then(function () {
        return q.ninvoke(self._db, "update", query, update);
    });
};

EmbeddedCollection.prototype.exec = function (query) {
    var qr = query.$count ? this._db.count(query.$filter) : this._db.find(query.$filter);

    //if (query.sort) {
    //    q = q.sort(query.sort);
    //}
    if (query.$skip) {
        qr = qr.skip(query.$skip);
    }
    if (query.$limit) {
        qr = qr.limit(query.$limit);
    }

    return q.ninvoke(qr, "exec");
};