/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension allowing to add custom javascript hooks into the rendering process.
 */

var shortid = require("shortid"),
    _ = require("underscore"),
    path = require("path"),
    q = require("q"),
    extend = require("node.extend");

var Scripts = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;
    this.definition.options.timeout = this.definition.options.timeout || 30000;

    this._defineEntities();

    this.reporter.beforeRenderListeners.add(definition.name, this, Scripts.prototype.handleBeforeRender);
    this.reporter.afterRenderListeners.add(definition.name, this, Scripts.prototype.handleAfterRender);

    this.allowedModules = this.definition.options.allowedModules || ["handlebars", "request-json", "feedparser", "request", "underscore", "constants", "sendgrid"];
};

Scripts.prototype.handleAfterRender = function (request, response) {
    if (!request.parsedScript)
        return q();

    if (!request.options.isRootRequest)
        return q();

    var self = this;

    return q.ninvoke(request.reporter.scriptManager, "execute", {
        script: request.parsedScript,
        allowedModules: self.allowedModules,
        method: "afterRender",
        request: {
            data: request.data,
            template: {
                content: request.template.content,
                helpers: request.template.helpers
            },
            options: request.options,
            headers: request.headers
        },
        response: {
            headers: response.headers,
            content: response.result
        }
    }, {
        execModulePath: path.join(__dirname, "scriptEvalChild.js"),
        timeout: self.definition.options.timeout
    }).then(function (body) {
        response.headers = body.response.headers;
        response.result = new Buffer(body.response.content);
    });
};

Scripts.prototype.handleBeforeRender = function (request, response) {
    var self = this;

    //back compatibility
    if (!request.template.script && request.template.scriptId) {
        request.template.script = {shortid: request.template.scriptId};
    }

    if (!request.template.script || (!request.template.script.shortid && !request.template.script.content)) {
        return q();
    }

    function findScript() {
        if (request.template.script.content)
            return q(request.template.script);

        return self.reporter.documentStore.collection("scripts").find({shortid: request.template.script.shortid}).then(function (items) {
            if (items.length < 1)
                throw new Error("Script not found or user not authorized to read it (" + request.template.script.shortid + ")");
            return items[0];
        });
    }

    return findScript().then(function (script) {
        self.reporter.logger.debug("Executing script " + script.shortid);
        script = script.content || script;

        request.parsedScript = script;
        return q.ninvoke(request.reporter.scriptManager, "execute", {
            script: script,
            allowedModules: self.allowedModules,
            method: "beforeRender",
            request: {
                data: request.data,
                template: request.template,
                headers: request.headers,
                options: request.options
            },
            response: response
        }, {
            execModulePath: path.join(__dirname, "scriptEvalChild.js"),
            timeout: self.definition.options.timeout
        }).then(function (body) {
            if (body.cancelRequest) {
                var error = new Error("Rendering request canceled  from the script " + body.additionalInfo);
                error.weak = true;
                return q.reject(error);
            }
            if (!body.shouldRunAfterRender) {
                request.parsedScript = null;
            }

            function merge(obj, obj2) {
                for (var key in obj2) {
                    if (typeof obj2[key] === undefined)
                        continue;

                    if (typeof obj2[key] !== 'object' || typeof obj[key] === 'undefined') {
                        obj[key] = obj2[key];
                    } else {
                        merge(obj[key], obj2[key]);
                    }
                }
            }

            merge(request, body.request);
            return response;
        });
    });
};

Scripts.prototype._defineEntities = function () {
    var self = this;
    this.reporter.documentStore.registerEntityType("ScriptType", {
        _id: {type: "Edm.String", key: true},
        shortid: {type: "Edm.String"},
        creationDate: {type: "Edm.DateTimeOffset"},
        modificationDate: {type: "Edm.DateTimeOffset"},
        content: {type: "Edm.String"},
        name: {type: "Edm.String"}
    });

    this.reporter.documentStore.registerComplexType("ScriptRefType", {
        content: {type: "Edm.String"},
        shortid: {type: "Edm.String"}
    });

    this.reporter.documentStore.model.entityTypes["TemplateType"].script = {type: "jsreport.ScriptRefType"};
    this.reporter.documentStore.registerEntitySet("scripts", {entityType: "ScriptType", humanReadableKey: "shortid"});

    this.reporter.initializeListener.add("scripts", function () {
        var col = self.reporter.documentStore.collection("scripts");
        col.beforeUpdateListeners.add("scripts", function (query, update) {
            update.$set.modificationDate = new Date();
        });
        col.beforeInsertListeners.add("scripts", function (doc) {
            doc.shortid = doc.shortid || shortid.generate();
            doc.creationDate = new Date();
            doc.modificationDate = new Date();
        });
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Scripts(reporter, definition);
};