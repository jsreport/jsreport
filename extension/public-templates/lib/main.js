﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Extension allows to share report template with non authenticated users by providing
 * auth tokens.
 */

var url = require("url"),
    S = require("string"),
    q = require("q"),
    _ = require("underscore"),
    uuid = require("uuid").v1;

function handleAuthorization(reporter, definition) {
    reporter.initializeListener.add("public-templates", function () {
        /*add authorization hooks for shared templates*/

        //everything is public anyway...
        if (!reporter.authentication) {
            return;
        }

        reporter.emit("export-public-route", "/public-templates");
        reporter.emit("export-public-route", "/api/report");
        reporter.emit("export-public-route", "/odata");

        if (!reporter.authorization) {
            reporter.logger.warn("Sharing templates won't work properly without authorization extension.");
            return;
        }

        function verifyToken(req, query, token) {
            req.skipAuthorizationForQuery = query;
            return reporter.documentStore.collection("templates").find(query).then(function(templates) {
                if (templates.length !== 1) {
                    var e = new Error("Unauthorized");
                    e.unauthorized = true;
                    throw e;
                }

                var template = templates[0];

                if (template.writeSharingToken !== token && template.readSharingToken !== token)
                    throw new Error("Unauthorized");

                req.tokenVerified = true;
                req.skipAuthorizationForUpdate = query;
            });
        }

        for (var key in reporter.documentStore.collections) {
            var col = reporter.documentStore.collections[key];

            col.beforeUpdateListeners.insert(0, "public-templates", col, function(query, update) {
                if (!process.domain || !process.domain.req)
                    return;

                if (this.name === "templates" && !process.domain.req.user && update.$set && update.$set.writeSharingToken) {
                    return verifyToken(process.domain.req, query, update.$set.writeSharingToken);
                };
            });

            col.beforeInsertListeners.insert(0, "public-templates", col, function(doc) {
                if (!process.domain || !process.domain.req)
                    return;

                if (this.name === "templatesHistory") {
                    process.domain.req.skipAuthorizationForInsert = doc;
                };
            });

            col.beforeFindListeners.add("public-templates", col, function(query) {
                if (!process.domain || !process.domain.req)
                    return;

                var req = process.domain.req;

                if (req.user || req.skipAuthorizationForQuery === query || req.tokenVerified)
                    return;

                if (this.name === "templates" && req.query.access_token) {

                    if (S(req.url).startsWith("/api/report") || S(req.url).startsWith("/public-templates")) {
                        delete query.readPermissions;
                    }

                    return verifyToken(req, query, req.query.access_token);
                } else {
                    var e = new Error("Unauthorized");
                    e.unauthorized = true;
                    throw e;
                }
            });
        }
    });
}

function defineEntities(reporter) {
    reporter.documentStore.model.entityTypes["TemplateType"].readSharingToken = {type: "Edm.String"};
    reporter.documentStore.model.entityTypes["TemplateType"].writeSharingToken = {type: "Edm.String"};
}

function generateSharingToken(reporter, shortid, operation) {
    return reporter.documentStore.collection("templates").find( { shortid: shortid}).then(function (templates) {
        var template = templates[0];
        var token = uuid();
        if (operation === "read")
            template.readSharingToken = token;
        else
            template.writeSharingToken = token;

        return reporter.documentStore.collection("templates").update({ shortid: shortid}, { $set: {
            readSharingToken: template.readSharingToken,
            writeSharingToken: template.writeSharingToken
        }}).then(function() {
            return token;
        });
    });
}

function configureExpress(app, reporter) {

    /* provide an access token for the shared template */
    app.get("/api/templates/sharing/:shortid/grant/:access", function (req, res, next) {
        generateSharingToken(reporter, req.params.shortid, req.params.access).then(function (token) {
            res.send({
                token: token
            });
        }).catch(function (e) {
            next(e);
        });
    });

    /* verify an access token and render the particular template */
    app.get("/public-templates", function (req, res, next) {
        var query = {
            $or: [ { readSharingToken: req.query.access_token }, { writeSharingToken: req.query.access_token }] };
        req.skipAuthorizationForQuery = query;
        reporter.documentStore.collection("templates").find(query).then(function(templates) {
            if (templates.length !== 1)
                return q.reject(new Error("Unauthorized"));


            var template = templates[0];

            req.template = template;
            req.options = {
                authorization: {
                    grantRead: template.readSharingToken === req.query.access_token,
                    grantWrite: template.writeSharingToken === req.query.access_token,
                    readToken: template.readSharingToken === req.query.access_token ? req.query.access_token : undefined,
                    writeToken: template.writeSharingToken === req.query.access_token ? req.query.access_token : undefined
                }
            };

            return reporter.render(req).then(function (response) {
                if (response.headers) {
                    for (var key in response.headers) {
                        if (response.headers.hasOwnProperty(key))
                            res.setHeader(key, response.headers[key]);
                    }
                }

                if (_.isFunction(response.result.pipe)) {
                    response.result.pipe(res);
                } else {
                    res.send(response.result);
                }
            });
        }).catch(function (e) {
            next(e);
        });
    });
}

module.exports = function (reporter, definition) {

    reporter.on("express-configure", function (app) {
        configureExpress(app, reporter);
    });
    defineEntities(reporter);
    handleAuthorization(reporter, definition);

    reporter.validateRenderListeners.add(definition.name, this, function (req, res) {

        if (!reporter.authentication)
            return;

        if (!reporter.authorization)
            return;

        function generateTokens() {
            if (!req.options.authorization)
                return;

            var writeSharingToken = req.template.writeSharingToken;
            req.template.writeSharingToken = undefined;

            if (req.options.authorization.grantRead) {
                if (req.template.readSharingToken) {
                    req.options.authorization = {
                        readToken: req.template.readSharingToken
                    };
                    return;
                }

                return generateSharingToken(reporter, req.template.shortid, "read").then(function (token) {
                    req.template.readSharingToken = token;
                    req.options.authorization = {
                        readToken: token
                    };
                });
            } else {
                req.template.readSharingToken = undefined;
            }

            if (req.options.authorization.grantWrite) {
                req.template.writeSharingToken = writeSharingToken;
                if (writeSharingToken) {
                    req.options.authorization = {
                        writeToken: writeSharingToken
                    };
                    return;
                }

                return generateSharingToken(reporter, req.template.shortid, "write").then(function (token) {
                    req.template.writeSharingToken = token;
                    req.options.authorization = {
                        writeToken: token
                    };
                });
            }
        }

        return q().then(function () {
            return generateTokens();
        }).then(function () {
            if (req.user)
                return;

            if (!req.options.authorization) {
                throw new Error("User not authenticated and authorization tokens not specified.");
            }

            if (req.options.authorization.readToken === req.template.readSharingToken)
                return;

            if (req.options.authorization.writeToken === req.template.writeSharingToken)
                return;

            throw new Error("Authorization token does not match.");
        });
    });
};