/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension allowing to run custom scripts and modify request before rendering process starts.
 */

var shortid = require("shortid"),
    winston = require("winston"),
    fork = require('child_process').fork,
    _ = require("underscore"),
    join = require("path").join,
    q = require("q");

var logger = winston.loggers.get('jsreport');

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Scripts(reporter, definition);
};

var Scripts = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this._defineEntities();

    this.reporter.beforeRenderListeners.add(definition.name, this, Scripts.prototype.handleBeforeRender);
};

Scripts.prototype.create = function (context, script) {
    var entity = new this.ScriptType(script);
    context.scripts.add(entity);
    return context.scripts.saveChanges().then(function () {
        return q(entity);
    });
};

Scripts.prototype.handleBeforeRender = function (request, response) {
    if (!request.template.scriptId && !request.template.script) {
        logger.info("ScriptId not defined for this template.");
        return q();
    }

    function findScript() {
        if (request.template.script && request.template.script !== "")
            return q(request.template.script);

        logger.debug("Searching for before script to apply - " + request.template.scriptId);

        return request.context.scripts.single(function (s) {
            return s.shortid === this.id;
        }, { id: request.template.scriptId });
    }

    return findScript().then(function (script) {

        script = script.content || script;
        var child = fork(join(__dirname, "scriptEvalChild.js"));
        var isDone = false;

        return q.nfcall(function (cb) {

            child.on('message', function (m) {
                isDone = true;
                if (m.error) {
                    logger.error("Child process process resulted in error " + JSON.stringify(m.error));
                    logger.error(m);
                    return cb({ message: m.error, stack: m.errorStack });
                }

                logger.info("Child process successfully finished.");

                request.data = m.request.data;
                request.template.content = m.request.template.content;
                request.template.helpers = m.request.template.helpers;

                return cb();
            });

            child.send({
                script: script,
                request: {
                    data: request.data,
                    template: {
                        content: request.template.content,
                        helpers: request.template.helpers
                    }
                },
                response: response
            });

            logger.info("Child process started.");

            setTimeout(function () {
                if (isDone)
                    return;

                child.kill();
                logger.error("Child process resulted in timeout.");
                return cb({ message: "Timeout error during script execution" });
            }, 60000);
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

    this.ScriptType.addMember("_id", { type: "id", key: true, computed: true, nullable: false });
    this.reporter.templates.TemplateType.addMember("scriptId", { type: "string" });

    this.ScriptType.addEventListener("beforeCreate", Scripts.prototype._beforeCreateHandler.bind(this));
    this.ScriptType.addEventListener("beforeUpdate", Scripts.prototype._beforeUpdateHandler.bind(this));

    this.reporter.dataProvider.registerEntitySet("scripts", this.ScriptType, { tableOptions: { humanReadableKeys: [ "shortid"] }  });
}