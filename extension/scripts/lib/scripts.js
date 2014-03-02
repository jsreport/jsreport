/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension allowing to run custom scripts and modify request before rendering process starts.
 */ 

var shortid = require("shortid"),
    winston = require("winston"),
    fork = require('child_process').fork,
    sformat = require("stringformat"),
    _ = require("underscore"),
    join = require("path").join,
    Q = require("q");

var logger = winston.loggers.get('jsreport');

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Scripts(reporter, definition);
};

Scripts = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;
    
    this.ScriptType = $data.Class.define(reporter.extendGlobalTypeName("$entity.Script"), $data.Entity, null, {
        shortid: { type: "string"},
        creationDate: { type: "date" },
        modificationDate: { type: "date" },
        content: { type: "string" },
        name: { type: "string" },
    }, null);

    if (this.reporter.playgroundMode) {
        reporter.templates.TemplateType.addMember("script", { type: this.ScriptType });
    } else {
        this.ScriptType.addMember("_id", { type: "id", key: true, computed: true, nullable: false });
        reporter.templates.TemplateType.addMember("scriptId", { type: "string" });
    }
    
    this.ScriptType.addEventListener("beforeCreate", Scripts.prototype._beforeCreateHandler.bind(this));
    this.ScriptType.addEventListener("beforeUpdate", Scripts.prototype._beforeUpdateHandler.bind(this));
    
    this.reporter.extensionsManager.beforeRenderListeners.add(definition.name, this, Scripts.prototype.handleBeforeRender);
    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, createEntitySetDefinitions);
};

Scripts.prototype.create = function(context, script) {
    var entity = new this.ScriptType(script);
    context.scripts.add(entity);
    return context.scripts.saveChanges().then(function() { return Q(entity); });
};

Scripts.prototype.handleBeforeRender = function (request, response) {
    if (!request.template.scriptId && !(request.template.script != null && request.template.script.content)) {
        logger.info("ScriptId not defined for this template.");
        return Q();
    }

    function FindScript() {
        if (request.template.script != null && request.template.script != "")
            return Q(request.template.script);
        
        logger.debug("Searching for before script to apply - " + request.template.scriptId);

        return request.context.scripts.single(function(s) { return s.shortid == this.id; }, { id: request.template.scriptId });
    };

    return FindScript().then(function (script) {
        var qdefer = Q.defer();
        script = script.content || script;

        var child = fork(join(__dirname, "scriptEvalChild.js"));

        var isDone = false;

        child.on('message', function(m) {
            isDone = true;
            if (m.error) {
                logger.error("Child process process resulted in error " + JSON.stringify(m.error));
                logger.error(m);
                return qdefer.reject({ message: m.error, stack: m.errorStack });
            }

            logger.info("Child process successfully finished.");

            request.data = m.request.data;
            request.template.content = m.request.template.content;
            request.template.helpers = m.request.template.helpers;
        
            return qdefer.resolve();
        });
        
        child.send({
            script: script,
            request: {
                 data: request.data,
                 template: {
                     content: request.template.content,
                     helpers: request.template.helpers,
                 }
            },
            response: response
        });

        logger.info("Child process started.");

        setTimeout(function() {
            if (isDone)
                return;

            child.kill();
            logger.error("Child process resulted in timeout.");
            return qdefer.reject({ message: "Timeout error during script execution" });
        }, 60000);

        return qdefer.promise;
    });
};

Scripts.prototype._beforeCreateHandler = function(args, entity) {
     if (entity.shortid == null)
        entity.shortid = shortid.generate();
    
    entity.creationDate = new Date();
    entity.modificationDate = new Date();
};

Scripts.prototype._beforeUpdateHandler = function(args, entity) {
    entity.modificationDate = new Date();
};

function createEntitySetDefinitions(entitySets) {
    if (!this.reporter.playgroundMode) {
        entitySets["scripts"] = { type: $data.EntitySet, elementType: this.ScriptType };
    }
};