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

Authorization.prototype.defaultAuthorizeOperation = function (entitySet, req, operation, entitySetKey, entity) {
    if (entitySetKey === "settings")
        return q(true);

    if (entity.context && entity.context.skipAuthorization) {
        return q(true);
    }

    if (!req) {//background jobs
        return q(true);
    }

    if (!req.user) {
        return q(false);
    }

    if (req.user.isAdmin)
        return q(true);

    if (entitySetKey === "users" && operation !== "Read" && (entity._id && entity._id !== req.user._id)) {
        return q(false);
    }

    if (entitySet.shared)
        return q(true);

    if (operation === "Create") {
        return q(true);
    }

    function checkPermissions(entity) {
        var permissions = operation === "Read" ? entity.readPermissions : entity.editPermissions;
        var permission = _.find(permissions, function (p) {
            return p === req.user._id;
        });

        if (!permission) {
            return q(false);
        }

        return q(true);
    }

    return this.reporter.dataProvider.startContext().then(function (context) {
        context.skipAuthorization = true;
        return context[entitySetKey].find(entity._id).then(function (entity) {
            return checkPermissions(entity);
        });
    });
};

Authorization.prototype.authorizeOperation = function (entitySet, req, operation, entitySetKey, entity) {
    var self = this;
    return this.defaultAuthorizeOperation(entitySet, req, operation, entitySetKey, entity).then(function (defaultRes) {
        return self.operationAuthorizationListeners.fireAndJoinResults(req, operation, entitySetKey, entity).then(function (overrideRes) {
            if (defaultRes && (overrideRes === null || overrideRes === true))
                return Authorization.authorizationResult.ok;

            if (!defaultRes && overrideRes === true)
                return Authorization.authorizationResult.ok;

            if (!defaultRes && overrideRes === null)
                return Authorization.authorizationResult.filterOut;

            return Authorization.authorizationResult.reject;
        });
    });
};

Authorization.prototype._registerAuthorizationListeners = function () {
    var self = this;

    var entitySets = this.reporter.dataProvider._entitySets;

    function afterReadListener(key, successResult, sets, query) {
        if (query.context.skipAuthorization || !process.domain) {
            return;
        }

        if (Array.isArray(successResult)) {
            successResult = Array.isArray(successResult) ? successResult : [successResult];

            return q.all(successResult.map(function (i) {
                return self.authorizeOperation(entitySets[key], process.domain.req, "Read", key, i).then(function (result) {
                    if (result === Authorization.authorizationResult.filterOut) {
                        successResult.splice(successResult.indexOf(i), 1);
                        return true;
                    }
                    if (result === Authorization.authorizationResult.ok) {
                        return true;
                    }

                    if (result === Authorization.authorizationResult.reject) {
                        var error = new Error("Unauthorized");
                        error.unauthorized = true;
                        process.domain.res.error(error);
                        return q.reject(error);
                    }
                });
            }));
        } else {
            return self.authorizeOperation(entitySets[key], process.domain.req, "Read", key, successResult).then(function (result) {
                if (!result) {
                    process.domain.res.error(new Error("Unauthorized access"));
                }
            });
        }
    }

    function registerOperationListener(operation) {
        entitySets[key]["before" + operation + "Listeners"].add("authorization", function (key, items) {
            if (!process.domain)
                return true;

            return q.all(items.map(function (i) {
                return self.authorizeOperation(entitySets[key], process.domain.req, operation, key, i);
            })).then(function (res) {
                return res.filter(function (r) {
                        return r;
                    }).length === res.length;
            });
        });
    }

    for (var key in entitySets) {
        entitySets[key].afterReadListeners.add("authorization " + key, afterReadListener);
        ["Create", "Update", "Delete"].forEach(registerOperationListener);
    }
};

Authorization.prototype._registerQueryFilteringByPermission = function () {
    var self = this;
    this.reporter.dataProvider.on("context-created", function (context) {
        context.events.on("before-query", function (dataProvider, query, entitySet) {

            if (self.reporter.dataProvider._entitySets[entitySet.name].shared)
                return;

            if (process.domain && process.domain.req && process.domain.req.user && process.domain.req.user._id && !process.domain.req.user.isAdmin) {
                query.readPermissions = dataProvider.fieldConverter.toDb["$data.ObjectID"](process.domain.req.user._id);
            }
        });
    });
};

Authorization.prototype._extendEntitiesWithPermissions = function () {

    function isRequestEligibleForAuth() {
        return process.domain && process.domain.req && process.domain.req.user && !process.domain.req.user.isAdmin;
    }

    function beforeCreate(args, entity) {
            if (!isRequestEligibleForAuth()) {
                return;
            }

            entity.readPermissions = entity.readPermissions || [];
            entity.editPermissions = entity.editPermissions || [];
            entity.readPermissions.push(process.domain.req.user._id);
            entity.editPermissions.push(process.domain.req.user._id);
    }

    function beforeUpdate(args, entity) {
        if (!isRequestEligibleForAuth()) {
            return;
        }

        entity.readPermissions = entity.readPermissions || [];
        entity.editPermissions = entity.editPermissions || [];

        entity.editPermissions.forEach(function (wp) {
            if (entity.readPermissions.indexOf(wp) === -1) {
                entity.readPermissions.push(wp);
            }
        });

        if (entity.readPermissions.indexOf(process.domain.req.user._id) === -1) {
            entity.readPermissions.push(process.domain.req.user._id);
        }

        if (entity.editPermissions.indexOf(process.domain.req.user._id) === -1) {
            entity.editPermissions.push(process.domain.req.user._id);
        }
    }

    this.reporter.dataProvider.on("building-context", function (entitySets) {
        for (var key in entitySets) {
            var entitySet = entitySets[key];
            if (entitySet.shared)
                continue;

            entitySet.elementType.addMember("readPermissions", {type: "Array", elementType: "id"});
            entitySet.elementType.addMember("editPermissions", {type: "Array", elementType: "id"});

            entitySet.elementType.addEventListener("beforeCreate", beforeCreate);
            entitySet.elementType.addEventListener("beforeUpdate", beforeUpdate);
        }
    });
};

Authorization.prototype._initialize = function () {
    this._registerAuthorizationListeners();
    this._registerQueryFilteringByPermission();
};

module.exports = function (reporter, definition) {

    if (!reporter.authentication)
        return;

    reporter.authorization = new Authorization(reporter, definition);
    reporter.authorization._extendEntitiesWithPermissions();
};
