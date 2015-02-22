var q = require("q");
var ListenerCollection = require("../util/listenerCollection.js");
var util = require("../util/util.js");

var InMemoryProvider = module.exports = function (model, options) {
    this._model = model;
    this._options = options;
    this.collections = {};
};

InMemoryProvider.prototype.init = function () {
    var self = this;
    var promises = Object.keys(this._model.entitySets).map(function (key) {
        var entitySet  = self._model.entitySets[key];
        var col = new InMemoryCollection(key, entitySet, self._model.entityTypes[entitySet.type], self._options);
        self.collections[key] = col;
        return q();
    });

    return q.all(promises);
};

InMemoryProvider.prototype.drop = function() {
    return q();
}

InMemoryProvider.prototype.collection = function (name) {
    return this.collections[name];
};

function InMemoryCollection(name, entitySet, entityType, options) {
    this.name = name;
    this._options = options;
    this.entitySet = entitySet;
    this.entityType = entityType;
    this.beforeFindListeners = new ListenerCollection();
    this.beforeUpdateListeners = new ListenerCollection();
    this.beforeInsertListeners = new ListenerCollection();
    this.beforeRemoveListeners = new ListenerCollection();
}

InMemoryCollection.prototype.load = function () {
    return q();
};

InMemoryCollection.prototype.find = function (query) {
    var self = this;
    return this.beforeFindListeners.fire(query).then(function () {
        return q([]);
    });
};

InMemoryCollection.prototype.count = function (query) {
    return q(0);
};

InMemoryCollection.prototype.insert = function (doc) {
    var self = this;
    return this.beforeInsertListeners.fire(doc).then(function () {
        return q();
    });
};

InMemoryCollection.prototype.update = function (query, update, options) {
    options = options || {};
    var self = this;
    return this.beforeUpdateListeners.fire(query, update).then(function () {
        return q();
    });
};

InMemoryCollection.prototype.remove = function (query) {
    var self = this;
    return this.beforeRemoveListeners.fire(query).then(function () {
        return q();
    });
};

InMemoryCollection.prototype.exec = function (query) {
    var self = this;

    function fn() {
        var qr = query.$count ? this._db.count(query.$filter) : self._db.find(query.$filter);

        if (query.$sort) {
            qr = qr.sort(query.$sort);
        }
        if (query.$skip) {
            qr = qr.skip(query.$skip);
        }
        if (query.$limit) {
            qr = qr.limit(query.$limit);
        }

        return q();
    }

    return this.beforeFindListeners.fire(query.$filter).then(function () {
        return fn();
    });
};