var q = require("q");
var Datastore = require("mongodb");
var _ = require("underscore");
var ListenerCollection = require("../util/listenerCollection.js");
var util = require("../util/util.js");
var mongoConnectionProvider = require("./mongoConnectionProvider");
var ObjectId = require('mongodb').ObjectID;

var MongoProvider = module.exports = function (model, options) {
    this._model = model;
    this._options = options;
    this.collections = {};
    this._options.connectionString.logger = this._options.logger;
    this.db = q.denodeify(mongoConnectionProvider(this._options.connectionString));
};

MongoProvider.prototype.init = function () {
    var self = this;

    Object.keys(this._model.entitySets).map(function (key) {
        var entitySet = self._model.entitySets[key];
        var col = new MongoCollection(key, entitySet, self._model.entityTypes[entitySet.type], self._options, self.db);
        self.collections[key] = col;
    });

    return q();
};

MongoProvider.prototype.drop = function () {
    return this.db().then(function (db) {
        return q.ninvoke(db, "dropDatabase");
    });
}

MongoProvider.prototype.collection = function (name) {
    return this.collections[name];
};


function MongoCollection(name, entitySet, entityType, options, db) {
    this.name = name;
    this._options = options;
    this.entitySet = entitySet;
    this.entityType = entityType;
    this.beforeFindListeners = new ListenerCollection();
    this.beforeUpdateListeners = new ListenerCollection();
    this.beforeInsertListeners = new ListenerCollection();
    this.beforeRemoveListeners = new ListenerCollection();
    this.db = db;
}


function _convertStringsToObjectIds(o) {
    var self = this;
    for (var i in o) {

        if (i === "_id" && _.isString(o[i])) {
            o[i] = new ObjectId(o[i]);
        }

        if (o[i] !== null && typeof(o[i]) == "object") {
            _convertStringsToObjectIds(o[i]);
        }
    }
};

function _convertBsonToBuffer(o) {
    for (var i in o) {

        if (o[i] && o[i]._bsontype === "Binary") {
            o[i] = o[i].buffer;
            continue;
        }

        if (o[i] !== null && typeof(o[i]) == "object") {
            _convertBsonToBuffer(o[i]);
        }
    }
};

MongoCollection.prototype.find = function (query) {
    var self = this;

    _convertStringsToObjectIds(query);

    return self.db().then(function (db) {
        return self.beforeFindListeners.fire(query).then(function () {
            return q.ninvoke(db.collection(self.name).find(query), "toArray").then(function(res) {
                _convertBsonToBuffer(res);
                return res;
            })
        });
    });
};

MongoCollection.prototype.count = function (query) {
    var self = this;
    _convertStringsToObjectIds(query);

    return self.db().then(function (db) {
        return q.ninvoke(db.collection(self.name), "count", query);
    });
};

MongoCollection.prototype.insert = function (doc) {
    var self = this;
    return self.db().then(function (db) {
        return self.beforeInsertListeners.fire(doc).then(function () {
            return q.ninvoke(db.collection(self.name), "insert", doc).then(function (res) {
                if (res.length !== 1)
                    throw new Error("Mongo insert should return single document");

                return res[0];
            })
        });
    });
};

MongoCollection.prototype.update = function (query, update, options) {
    options = options || {};
    var self = this;

    _convertStringsToObjectIds(query);

    if (update.$set)
        delete update.$set._id;

    return self.db().then(function (db) {
        return self.beforeUpdateListeners.fire(query, update).then(function () {
            return q.ninvoke(db.collection(self.name), "update", query, update, options).then(function(res) {
                if (!res[1].ok)
                    throw new Error("Update not successful");

                return res[0];
            });
        });
    });
};

MongoCollection.prototype.remove = function (query) {
    var self = this;

    _convertStringsToObjectIds(query);

    return self.db().then(function (db) {
        return self.beforeRemoveListeners.fire(query).then(function () {
            return q.ninvoke(db.collection(self.name), "remove", query);
        });
    });
};

MongoCollection.prototype.exec = function (query) {
    var self = this;

    /*if (query.$filter._id) {
        query.$filter._id = new ObjectId(query.$filter._id);
    }*/
    _convertStringsToObjectIds(query.$filter);

    function fn() {
        return self.db().then(function (db) {
            var qr = db.collection(self.name).find(query.$filter);

            if (query.$sort) {
                qr = qr.sort(query.$sort);
            }
            if (query.$skip) {
                qr = qr.skip(query.$skip);
            }
            if (query.$limit) {
                qr = qr.limit(query.$limit);
            }

            return q.ninvoke(qr, query.$count ? "count" : "toArray").then(function (val) {
                _convertBsonToBuffer(val);

                if (!query.$inlinecount) {
                    return val;
                }

                return q.ninvoke(db.collection(self.name).find(query.$filter), "count").then(function (c) {
                    return {
                        count: c,
                        value: val
                    }
                });
            });
        });
    }

    return this.beforeFindListeners.fire(query.$filter).then(function () {
        return fn();
    });
};