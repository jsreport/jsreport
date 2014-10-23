/*!
 * Copyright(c) 2014 Jan Blaha
 *
 */

var q = require("q"),
    path = require("path"),
    request = require("request"),
    extend = require("node.extend");

module.exports = function (reporter, definition) {

    if (!definition.options.externalService.url) {
        return;
    }

    function authorize(operation, itemType, shortid) {
        if (process.domain.req.user) {
            return q(true);
        }

        var deferred = q.defer();

        var headers = definition.options.externalService.headers || {};
        headers.cookie = process.domain.req.headers["host-cookie"]

        request({
            url: definition.options.externalService.url + "/jsreport/authorization/" + operation.toLowerCase() + "/" + itemType + "/" + shortid,
            headers: headers,
            json: true
        }, function(error, response, body) {
            if (error) {
                reporter.logger.error("Authorization failed with error: " + error);
                return deferred.reject(error);
            }

            deferred.resolve(response.statusCode === 200);
        });

        return deferred.promise;
    }

    reporter.initializeListener.add("authorization", function() {
        var entitySets = reporter.dataProvider._entitySets;

        for (var key in entitySets) {

            entitySets[key].afterReadListeners.add("authorization " + key, function (key, successResult, sets, query) {
                successResult = Array.isArray(successResult) ? successResult : [successResult];

                return q.all(successResult.map(function(i) {
                    if (!i.shortid)
                        return;

                    return authorize("Read", key, i.shortid).then(function(result) {
                        if (!result)
                            successResult.splice(successResult.indexOf(i), 1);
                    });
                }));
            });

            ["Create", "Update", "Delete"].forEach(function(m) {
                entitySets[key]["before" + m + "Listeners"].add("authorization", function (key, items) {
                    return q.all(items.map(function(i) {
                        if (!i.shortid)
                            return q(true);

                        return authorize(m, key, i.shortid);
                    })).then(function(res) {
                        return res.filter(function(r) { return r; }).length === res.length;
                    });
                });
            })
        }
    });
};
