/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Core extension responsible for storing, versioning and loading report templates for render request..
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

        reporter.emit("export-public-route", "/templates/sharing");
        reporter.emit("export-public-route", "/api/report");
        reporter.emit("export-public-route", "/odata");

        if (!reporter.authorization) {
            reporter.logger.warn("Sharing templates won't work properly without authorization extension.");
            return;
        }

        //user should be able to render anonymous reports from the shared template
        //this is required for printing into pdf for example
        //reporter.authorization.requestAuthorizationListeners.add(definition.name, function (req, res) {
        //
        //    if (req.isAuthenticated() || !S(req.url).startsWith("/api/report")) {
        //        return true;
        //    }
        //
        //    var token = req.body.template.writeSharingToken || req.body.template.readSharingToken;
        //
        //    if (!token)
        //        return false;
        //
        //    return reporter.dataProvider.startContext().then(function (context) {
        //        return context.templates.filter(function (t) {
        //            return t.readSharingToken === this.uuid || t.writeSharingToken === this.uuid;
        //        }, {uuid: token}).toArray();
        //    }).then(function (templates) {
        //        return true;
        //    }).catch(function (e) {
        //        return false;
        //    });
        //});

        //user should be able to access the shared template for read with read token
        //and for update with write token
        reporter.authorization.operationAuthorizationListeners.add(definition.name, function (req, operation, entitySet, entity) {
            if (req.isAuthenticated() || S(req.url).startsWith("/api/report") || S(req.url).startsWith("/templates/sharing")) {
                return true;
            }
            if (entitySet === "templatesHistory" && operation === "Create") {
                return true;
            }

            if (entitySet !== "templates")
                return false;

            if (req.skipAuthForId && entity._id === req.skipAuthForId)
                return true;

            if (operation !== "Read" && operation !== "Update") {
                return false;
            }

            req.skipAuthForId = entity._id;

            return reporter.dataProvider.startContext().then(function (context) {
                return context.templates.find(entity._id);
            }).then(function (template) {
                req.skipAuthForId = null;
                return entity.writeSharingToken && (template.writeSharingToken === entity.writeSharingToken);
            }).catch(function (e) {
                req.skipAuthForId = null;
                return false;
            });


            //function findTemplate() {
            //    if (entitySet === "templates")
            //        return q(entity);
            //
            //    if (entitySet === "data" || entitySet === "scripts") {
            //        return reporter.dataProvider.startContext().then(function (context) {
            //            return context.templates.filter(function (t) {
            //                return t.readSharingToken === this.uuid || t.writeSharingToken === this.uuid;
            //            }, {uuid: token}).toArray();
            //        }).then(function (templates) {
            //            if (templates.length !== 1)
            //                return null;
            //
            //            if (entitySet === "data" && templates[0].data && templates[0].data.shortid === entity.shortid)
            //                return templates[0];
            //
            //            if (entitySet === "scripts" && templates[0].script && templates[0].script.shortid === entity.shortid)
            //                return templates[0];
            //
            //            return null;
            //        }).catch(function (e) {
            //            return null;
            //        });
            //    }
            //}
            //
            //return findTemplate().then(function (entity) {
            //    var writeValid = entity.writeSharingToken && entity.writeSharingToken === token;
            //    var readValid = entity.readSharingToken && entity.readSharingToken === token;
            //
            //    if (operation === "Update") {
            //        return writeValid;
            //    }
            //
            //    if (operation === "Read") {
            //        return readValid || writeValid;
            //    }
            //
            //    return false;
            //});
        });
    });
}

function defineEntities(reporter) {
    reporter.templates.TemplateType.addMember("readSharingToken", {type: "string"});
    reporter.templates.TemplateType.addMember("writeSharingToken", {type: "string"});
}

function generateSharingToken(reporter, shortid, operation) {
    return reporter.dataProvider.startContext().then(function (context) {
        return context.templates.single(function (t) {
            return t.shortid === this.shortid;
        }, {shortid: shortid}).then(function (template) {
            context.templates.attach(template);
            var token = uuid();
            if (operation === "read")
                template.readSharingToken = token;
            else
                template.writeSharingToken = token;
            return context.saveChanges().then(function () {
                return token;
            });
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
    app.get("/templates/sharing", function (req, res, next) {
        reporter.dataProvider.startContext().then(function (context) {
            return context.templates.filter(function (t) {
                return t.readSharingToken === this.uuid || t.writeSharingToken === this.uuid;
            }, {uuid: req.query.access_token})
                .toArray().then(function (templates) {
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

        if (!req.options.authorization)
            return;

        function generateTokens() {
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
            if (!req.options.authorization)
                return q.reject(new Error("Authorization options not specified."));

            if (req.options.authorization.readToken === req.template.readSharingToken)
                return;

            if (req.options.authorization.writeToken === req.template.writeSharingToken)
                return;

            return q.reject(new Error("Authorization token does not match."));
        });
    });
};