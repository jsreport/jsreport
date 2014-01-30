var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    events = require("events"),
    util = require("util"),
    fork = require('child_process').fork,
    sformat = require("stringformat"),
    async = require("async"),
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

    Object.defineProperty(this, "entitySet", {
        get: function () {
            return reporter.context.scripts;
        }
    });
    
    this.ScriptType = $data.Class.define(reporter.extendGlobalTypeName("$entity.Script"), $data.Entity, null, {
        shortid: { type: "string"},
        content: { type: "string" },
        name: { type: "string" },
    }, null);

    if (this.reporter.playgroundMode) {
        reporter.templates.TemplateType.addMember("script", { type: this.ScriptType });
    } else {
        this.ScriptType.addMember("_id", { type: "id", key: true, computed: true, nullable: false });
        reporter.templates.TemplateType.addMember("scriptId", { type: "id" });
    }
    
    this.ScriptType.addEventListener("beforeCreate", Scripts.prototype._beforeCreateHandler.bind(this));
    this.reporter.extensionsManager.beforeRenderListeners.add(definition.name, this, Scripts.prototype.handleBeforeRender);
    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, createEntitySetDefinitions);
};

Scripts.prototype.create = function(script) {
    var entity = new this.ScriptType(script);
    this.entitySet.add(entity);
    return this.entitySet.saveChanges().then(function() { return Q(entity); });
};

Scripts.prototype.handleBeforeRender = function (request, response) {
    var self = this;
    
    if (!request.template.scriptId && !request.template.script) {
        logger.info("ScriptId not defined for this template.");
        return;
    }

    function FindScript() {
        if (request.template.script != null && request.template.script != "")
            return Q(request.template.script);
        
        logger.debug("Searching for before script to apply - " + request.template.scriptId);

        return self.entitySet.find(request.template.scriptId);
    };

    return FindScript().then(function (script) {
        var deferred = Q.defer();
        script = script.content || script;

        var child = fork(join(__dirname, "scriptEvalChild.js"));

        var isDone = false;

        child.on('message', function(m) {
            isDone = true;
            if (m.error) {
                logger.error("Child process process resulted in error " + JSON.stringify(m.error));
                logger.error(m);
                return deferred.reject({ message: m.error, stack: m.errorStack });
            }

            logger.info("Child process successfully finished.");
            _.extend(request, m.request);
            _.extend(response, m.response);
            return deferred.resolve();
        });

        logger.info(JSON.stringify(request.template));
        
        child.send({
            script: script,
            request: { data: request.data},
            response: response
        });

        logger.info("Child process started.");

        setTimeout(function() {
            if (isDone)
                return;

            child.kill();
            logger.error("Child process resulted in timeout.");
            return deferred.reject({ message: "Timeout error during script execution" });
        }, 60000);

        return deferred.promise;
    });
};

Scripts.prototype._beforeCreateHandler = function(args, entity) {
     if (entity.shortid == null)
        entity.shortid = shortid.generate();
    
     if (entity.name == null)
        entity.name = "not set";
};

function createEntitySetDefinitions(entitySets, next) {
    if (!this.reporter.playgroundMode) {
        entitySets["scripts"] = { type: $data.EntitySet, elementType: this.ScriptType };
    }
    next();
};