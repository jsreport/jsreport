var q = require("q");
var Datastore = require("nedb");
var path = require("path");
var ListenerCollection = require("../util/listenerCollection.js");
var util = require("../util/util.js");
var Persistence = require("./persistence.js")

var EmbeddedProvider = module.exports = function (model, options) {
    this._model = model;
    this._options = options;
    this.collections = {};
};

EmbeddedProvider.prototype.init = function () {
    var self = this;

    var promises = Object.keys(this._model.entitySets).map(function (key) {
        var entitySet = self._model.entitySets[key];
        var col = new EmbeddedCollection(key, entitySet, self._model.entityTypes[entitySet.type], self._options);
        self.collections[key] = col;
        return col.load();
    });

    return q.all(promises);
};

EmbeddedProvider.prototype.drop = function () {
    util.deleteFiles(this._options.dataDirectory);
    return q();
}

EmbeddedProvider.prototype.collection = function (name) {
    return this.collections[name];
};


function EmbeddedCollection(name, entitySet, entityType, options) {
    this.name = name;
    this._options = options;
    this.entitySet = entitySet;
    this.entityType = entityType;
    this.beforeFindListeners = new ListenerCollection();
    this.beforeUpdateListeners = new ListenerCollection();
    this.beforeInsertListeners = new ListenerCollection();
    this.beforeRemoveListeners = new ListenerCollection();
}

EmbeddedCollection.prototype._convertBinaryToBuffer = function (res) {
    var self = this;
    for (var i in res) {
        for (var prop in res[i]) {
            if (!prop)
                continue;

            var propDef = self.entityType[prop];

            if (!propDef)
                continue;

            if (propDef.type === "Edm.Binary")
                res[i][prop] = new Buffer(res[i][prop]);
        }
    }
};

EmbeddedCollection.prototype.load = function () {
    this._db = new Datastore({filename: path.join(this._options.dataDirectory, this.name), autoload: false});

    if (this.entitySet.humanReadableKey)
        this._db.persistence = new Persistence({
            db: this._db,
            keys: [this.entitySet.humanReadableKey]
        });

    return q.ninvoke(this._db, "loadDatabase");
};

EmbeddedCollection.prototype.find = function (query) {
    var self = this;
    return this.beforeFindListeners.fire(query).then(function () {
        return q.ninvoke(self._db, "find", query).then(function(res) {
            self._convertBinaryToBuffer(res);
            return res;
        })
    });
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

EmbeddedCollection.prototype.update = function (query, update, options) {
    options = options || {};
    var self = this;
    return this.beforeUpdateListeners.fire(query, update).then(function () {
        return q.ninvoke(self._db, "update", query, update, options);
    });
};

EmbeddedCollection.prototype.remove = function (query) {
    var self = this;
    return this.beforeRemoveListeners.fire(query).then(function () {
        return q.ninvoke(self._db, "remove", query);
    });
};

EmbeddedCollection.prototype.exec = function (query) {
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

        return q.ninvoke(qr, "exec").then(function (val) {
            self._convertBinaryToBuffer(val);

            if (!query.$inlinecount)
                return val;


            return q.ninvoke(self._db, "count", query.$filter).then(function (c) {
                return {
                    count: c,
                    value: val
                }
            });
        });
    }

    return this.beforeFindListeners.fire(query.$filter).then(function () {
        return fn();
    });
};