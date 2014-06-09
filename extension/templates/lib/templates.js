/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Core extension responsible for storing, versioning and loading report templates for render request..
 */

var stream = require("stream"),
    shortid = require("shortid"),
    winston = require("winston"),
    events = require("events"),
    util = require("util"),
    _ = require("underscore"),
    Q = require("q"),
    extend = require("node.extend");

var logger = winston.loggers.get('jsreport');

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Templating(reporter, definition);
};

var Templating = function (reporter, definition) {
    var self = this;
    this.name = "templates";
    this.reporter = reporter;
    this.definition = definition;

    this._defineEntities();

    this.TemplateType.addEventListener("beforeCreate", Templating.prototype._beforeCreateHandler.bind(this));
    this.TemplateType.addEventListener("beforeUpdate", Templating.prototype._beforeUpdateHandler.bind(this));

    this.reporter.beforeRenderListeners.add(definition.name, Templating.prototype.handleBeforeRender.bind(this));
    this.reporter.entitySetRegistrationListners.add(definition.name, Templating.prototype._createEntitySetDefinitions.bind(this));
};

util.inherits(Templating, events.EventEmitter);

Templating.prototype.handleBeforeRender = function (request, response) {

    if (request.template._id == null && request.template.shortid == null) {
        if (!request.template.content)
            throw new Error("Template must contains _id, shortid or content attribute.");

        return;
    }

    var findPromise = (request.template._id != null) ? request.context.templates.find(request.template._id) :
        request.context.templates.single(function (t) {
            return t.shortid == this.shortid
        }, { shortid: request.template.shortid });

    return findPromise.then(function (template) {
        extend(true, template, request.template);
        request.template = template;
    }, function () {
        throw new Error("Unable to find specified template: " + (request.template._id != null ? request.template._id : request.template.shortid));
    });
};

Templating.prototype.create = function (context, tmpl) {
    if (tmpl == null) {
        tmpl = context;
        context = this.reporter.context;
    }

    var template = new this.TemplateType(tmpl);
    template.isLatest = true;
    context.templates.add(template);

    return context.templates.saveChanges().then(function () {
        return Q(template);
    });
};

Templating.prototype._beforeUpdateHandler = function (args, entity) {
    entity.modificationDate = new Date();
};

Templating.prototype._beforeCreateHandler = function (args, entity) {
    if (entity.shortid == null)
        entity.shortid = shortid.generate();

    entity.modificationDate = new Date();
};

Templating.prototype._defineEntities = function () {
    var templateAttributes = {
        _id: { type: "id", key: true, computed: true, nullable: false },
        shortid: { type: "string" },
        name: { type: "string" },
        content: { type: "string" },
        recipe: { type: "string" },
        helpers: { type: "string" },
        engine: { type: "string" },
        modificationDate: { type: "date" }
    };

    this.TemplateHistoryType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.TemplateHistory"), $data.Entity, null, templateAttributes, null);

    this.TemplateType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.Template"), $data.Entity, null, templateAttributes, null);
};

Templating.prototype._copyHistory = function (entity) {
    var self = this;

    var context = this.reporter.startContext();
    return context.templates.find(entity._id).then(function (originalEntity) {
        var copy = _.extend({}, originalEntity.initData);
        delete copy._id;
        var history = new self.TemplateHistoryType(copy);
        context.templatesHistory.add(history);
        return context.templatesHistory.saveChanges();
    });
};


Templating.prototype._createEntitySetDefinitions = function (entitySets) {
    var self = this;
    entitySets["templates"] = { type: $data.EntitySet, elementType: self.TemplateType, tableOptions: { humanReadableKeys: [ "shortid"] } };

    entitySets["templatesHistory"] = { type: $data.EntitySet, elementType: self.TemplateHistoryType };

    entitySets["templates"].beforeUpdate = function (i) {
        return function (callback, items) {
            if (items[0]._id == null)
                return callback(false);

            var shouldBeHistorized = false;

            for (var i = 0; i < items[0].changedProperties.length; i++) {
                var propName = items[0].changedProperties[i].name;
                if (propName != "ValidationErrors" && propName != "modificationDate")
                    shouldBeHistorized = true;
            }


            if (!shouldBeHistorized)
                return callback(true);

            self._copyHistory(items[0]).then(function () {
                callback(true);
            }, function (err) {
                callback(false);
            });
        };
    }
};