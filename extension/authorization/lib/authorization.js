/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Extension for authorizing requests and data access. It is dependent on Authentication extension.
 *
 * Adds property readPermissions and editPermissions to every object as array od user ids identifying which
 * user can work on which object.
 */

var q = require("q"),
    path = require("path"),
    request = require("request"),
    extend = require("node.extend"),
    _ = require("underscore");

function Authorization(reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.requestAuthorizationListeners = reporter.createListenerCollection();
    this.operationAuthorizationListeners = reporter.createListenerCollection();
    reporter.initializeListener.add(definition.name, Authorization.prototype._initialize.bind(this));
}

Authorization.prototype.authorizeRequest = function (req, res) {
    return this.requestAuthorizationListeners.fireAndJoinResults(req, res).then(function (res) {
        if (res === null)
            return req.user !== null && req.user !== undefined;

        return res;
    });
};

Authorization.authorizationResult = {
    notDefined: "notDefined",
    reject: "reject",
    filterOut: "filterOut",
    ok: "ok"
};

Authorization.prototype.checkPermissions = function(entity, req) {
    var permissions = entity.editPermissions;
    var permission = _.find(permissions, function (p) {
        return p === req.user._id;
    });

    if (!permission) {
        return false;
    }

    return true;
}

Authorization.prototype.authorizeUpdate = function (query, update, collection, req) {
    var self = this;
    req.skipAuthorization = true;
    return collection.find(query).then(function (items) {
        req.skipAuthorization = false;
        var result = true;
        items.forEach(function (entity) {
            if (collection.name === "users" && (entity._id && entity._id !== req.user._id)) {
                result = false;
            }

            if (result)
                result = self.checkPermissions(entity, req);
        });
        return result;
    });
}

Authorization.prototype.authorizeRemove = function (query, collection, req) {
    var self = this;
    req.skipAuthorization = true;
    return collection.find(query).then(function (items) {
        req.skipAuthorization = false;
        var result = true;
        items.forEach(function (entity) {
            if (result)
                result = self.checkPermissions(entity, req);
        });
        return result;
    });
}

Authorization.prototype.defaultAuth = function (collection, req) {
    if (collection.name === "settings")
        return true;

    if (req.skipAuthorization) {
        return true;
    }

    if (!req) {//background jobs
        return true;
    }

    if (!req.user) {
        return false;
    }

    if (req.user.isAdmin)
        return true;

    return null;
}

Authorization.prototype._registerAuthorizationListeners = function () {
    var self = this;

    for (var key in this.reporter.documentStore.collections) {
        var col = self.reporter.documentStore.collections[key];

        if (col.entitySet.shared)
            continue;

        function check(colection, authAction) {
            function fn() {
                if (!process.domain || !process.domain.req)
                    return q(true);

                var defaultAuth = self.defaultAuth(colection, process.domain.req);
                if (defaultAuth === true)
                    return q(true);
                if (defaultAuth === false)
                    return q(false);

                return authAction();
            };

            return fn().then(function (res) {
                if (res !== true) {
                    self.reporter.logger.warn("User " + process.domain.req.user.username + " not authorized for " + collection.name);
                    var e = new Error("Unauthorized for " + colection.name);
                    e.unauthorized = true;
                    throw e;
                }
            });
        }

        col["beforeUpdateListeners"].add("authorization", col, function (query, update) {
            var col = this;
            if (!process.domain || !process.domain.req || process.domain.req.skipAuthorizationForUpdate === query)
               return;

            return check(col, function() {
                return self.authorizeUpdate(query, update, col, process.domain.req);
            })
        });

        col["beforeRemoveListeners"].add("authorization", col, function (query) {
            var col = this;
            return check(col, function() {
                return self.authorizeRemove(query, col, process.domain.req);
            })
        });

        col["beforeInsertListeners"].add("authorization", col, function (doc) {
            var col = this;
            if (!process.domain || !process.domain.req || process.domain.req.skipAuthorizationForInsert === doc)
                return;
            return check(col, function() {
                return q(true);
            })
        });
    }
};

Authorization.prototype._handlePermissionsInEntities = function () {
    var self = this;

    function isRequestEligibleForAuth() {
        return process.domain && process.domain.req && process.domain.req.user;
    }

    function beforeCreate(entity) {
        if (!isRequestEligibleForAuth()) {
            return;
        }

        entity.readPermissions = entity.readPermissions || [];
        entity.editPermissions = entity.editPermissions || [];
        entity.readPermissions.push(process.domain.req.user._id);
        entity.editPermissions.push(process.domain.req.user._id);
    }

    function beforeUpdate(query, update) {
        if (!isRequestEligibleForAuth()) {
            return;
        }

        var entity = update.$set;

        if (!entity || (!entity.readPermissions && !entity.editPermissions))
            return;

        entity.editPermissions = entity.editPermissions || [];
        entity.readPermissions = entity.readPermissions || [];

        if (entity.editPermissions.indexOf(process.domain.req.user._id) === -1) {
            entity.editPermissions.push(process.domain.req.user._id);
        }

        entity.editPermissions.forEach(function (wp) {
            if (entity.readPermissions.indexOf(wp) === -1) {
                entity.readPermissions.push(wp);
            }
        });
    }

    for (var key in self.reporter.documentStore.collections) {
        var col = self.reporter.documentStore.collections[key];
        if (col.entitySet.shared)
            continue;

        col.beforeUpdateListeners.add("auth-perm", col, beforeUpdate);
        col.beforeInsertListeners.add("auth-perm", col, beforeCreate);
        col.beforeFindListeners.add("auth-perm", col, function (query) {
            if (this.name === "users" || this.entitySet.shared)
                return;

            if (process.domain && process.domain.req && process.domain.req.user && process.domain.req.user._id && !process.domain.req.user.isAdmin &&
                process.domain.req.skipAuthorization !== true && process.domain.req.skipAuthorizationForQuery !== query) {
                query.readPermissions = process.domain.req.user._id;
            }
        });
    }
}

Authorization.prototype._extendEntitiesWithPermissions = function () {
    this.reporter.documentStore.on("before-init", function (documentStore) {
        for (var key in documentStore.model.entitySets) {
            var entitySet = documentStore.model.entitySets[key];
            if (entitySet.shared)
                continue;

            var entityType = documentStore.model.entityTypes[entitySet.type];

            entityType.readPermissions = {type: "Collection(Edm.String)"};
            entityType.editPermissions = {type: "Collection(Edm.String)"};
        }
    });
};

Authorization.prototype._initialize = function () {
    this._registerAuthorizationListeners();
    this._handlePermissionsInEntities();
};

module.exports = function (reporter, definition) {

    if (!reporter.authentication)
        return;

    reporter.authorization = new Authorization(reporter, definition);
    reporter.authorization._extendEntitiesWithPermissions();
};
