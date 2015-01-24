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

Scripts.prototype.create = function (context, script) {
    var entity = new this.ScriptType(script);
    context.scripts.add(entity);
    return context.scripts.saveChanges().then(function () {
        return q(entity);
    });
};

Scripts.prototype.handleAfterRender = function (request, response) {
    if (!request.parsedScript)
        return q();

    var self = this;

    return request.reporter.taskManager.execute({
            body: {
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
            },
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
        request.template.script = { shortid: request.template.scriptId};
    }

    if (!request.template.script || (!request.template.script.shortid && !request.template.script.content)) {
        self.reporter.logger.debug("Script not defined for this template.");
        return q();
    }

    function findScript() {
        if (request.template.script.content)
            return q(request.template.script);

        self.reporter.logger.debug("Searching for before script to apply - " + request.template.script.shortid);

        return request.context.scripts.single(function (s) {
            return s.shortid === this.id;
        }, { id: request.template.script.shortid });
    }

    return findScript().then(function (script) {
        script = script.content || script;

        request.parsedScript = script;

        return request.reporter.taskManager.execute({
            body: {
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
            },
            execModulePath: path.join(__dirname, "scriptEvalChild.js"),
            timeout: self.definition.options.timeout
        }).then(function(body) {
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

Scripts.prototype._beforeCreateHandler = function (args, entity) {
    if (!entity.shortid)
        entity.shortid = shortid.generate();

    entity.creationDate = new Date();
    entity.modificationDate = new Date();
};

Scripts.prototype._beforeUpdateHandler = function (args, entity) {
    entity.modificationDate = new Date();
};

Scripts.prototype._defineEntities = function() {

    this.ScriptType = this.reporter.dataProvider.createEntityType("ScriptType", {
        shortid: { type: "string"},
        creationDate: { type: "date" },
        modificationDate: { type: "date" },
        content: { type: "string" },
        name: { type: "string" }
    });

    this.ScriptRefType = this.reporter.dataProvider.createEntityType("ScriptRefType", {
        content: { type: "string" },
        shortid: { type: "string" }
    });

    this.reporter.templates.TemplateType.addMember("script", { type: this.ScriptRefType });

    this.ScriptType.addMember("_id", { type: "id", key: true, computed: true, nullable: false });

    this.ScriptType.addEventListener("beforeCreate", Scripts.prototype._beforeCreateHandler.bind(this));
    this.ScriptType.addEventListener("beforeUpdate", Scripts.prototype._beforeUpdateHandler.bind(this));

    this.reporter.dataProvider.registerEntitySet("scripts", this.ScriptType, { tableOptions: { humanReadableKeys: [ "shortid"] }  });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Scripts(reporter, definition);
};