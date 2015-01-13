/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Extension for authorizing requests and data access. It is dependent on Authentication extension.
 * Data and requests are authorized based on custom hooks from other extensions like Templates sharing
 * or based on external rest service specified in configuration.
 */

var q = require("q"),
    path = require("path"),
    request = require("request"),
    extend = require("node.extend"),
    urljoin = require('url-join');

function Authorization(reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.requestAuthorizationListeners = reporter.createListenerCollection();
    this.operationAuthorizationListeners = reporter.createListenerCollection();
    reporter.initializeListener.add(definition.name, Authorization.prototype._initialize.bind(this));
    this.operationAuthorizationListeners.add("external-service", Authorization.prototype.externalServiceOperationAuthorization.bind(this));

}

Authorization.prototype.authorizeRequest = function(req, res) {
    return this.requestAuthorizationListeners.fireAndJoinResults(req, res).then(function(res) {
        if (res === null)
            return req.isAuthenticated();
        return res;
    });
};

Authorization.prototype.externalServiceOperationAuthorization = function(req, operation, entitySet, entity) {
    if (!this.definition.options.externalService || !this.definition.options.externalService.url) {
        return null;
    }

    if (process.domain.req.isAuthenticated && process.domain.req.isAuthenticated()) {
        return q(true);
    }

    var self = this;

    var deferred = q.defer();

    var headers = this.definition.options.externalService.headers || {};
    headers.cookie = process.domain.req.headers["host-cookie"];
    headers.Authorization = process.domain.req.headers["Authorization"];

    var authUrl = urljoin(this.definition.options.externalService.url, operation.toLowerCase(), entitySet, entity.shortid);
    this.reporter.logger.debug("Requesting authorization at GET:" + authUrl);
    request({
        url: authUrl,
        headers: headers,
        json: true
    }, function (error, response, body) {
        if (error) {
            self.reporter.logger.error("Authorization failed with error: " + error);
            return deferred.reject(error);
        }

        self.reporter.logger.debug("Authorization response " + response.statusCode);

        deferred.resolve(response.statusCode === 200);
    });

    return deferred.promise;
};

Authorization.prototype.authorizeOperation = function(req, operation, entitySet, entity) {
    return this.operationAuthorizationListeners.fireAndJoinResults(req, operation, entitySet, entity).then(function(res) {
        if (res === null)
            return req.isAuthenticated();
        return res;
    });
};

Authorization.prototype._initialize = function() {
    var self = this;

    var entitySets = this.reporter.dataProvider._entitySets;


    function afterReadListener(key, successResult, sets, query) {

        if (Array.isArray(successResult)) {
            successResult = Array.isArray(successResult) ? successResult : [successResult];

            return q.all(successResult.map(function (i) {
                if (!i.shortid)
                    return;

                return self.authorizeOperation(process.domain.req, "Read", key, i).then(function (result) {
                    if (!result)
                        successResult.splice(successResult.indexOf(i), 1);
                });
            }));
        } else {
            return self.authorizeOperation(process.domain.req, "Read", key, successResult).then(function (result) {
                if (!result) {
                    process.domain.res.error(new Error("Unauthorized access"));
                }
            });
        }
    }

    function registerOperationListener(operation) {
        entitySets[key]["before" + operation + "Listeners"].add("authorization",  function (key, items) {
            return q.all(items.map(function (i) {
                if (!i.shortid)
                    return q(true);

                return self.authorizeOperation(process.domain.req, operation, key, i);
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

module.exports = function (reporter, definition) {
    reporter.authorization = new Authorization(reporter, definition);
};
