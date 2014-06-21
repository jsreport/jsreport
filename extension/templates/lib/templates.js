/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Core extension responsible for storing, versioning and loading report templates for render request..
 */

var stream = require("stream"),
    shortid = require("shortid"),
    events = require("events"),
    util = require("util"),
    _ = require("underscore"),
    q = require("q"),
    extend = require("node.extend");

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

    this._defineEntitySets();
};

util.inherits(Templating, events.EventEmitter);

Templating.prototype.handleBeforeRender = function (request, response) {

    if (!request.template._id && !request.template.shortid) {
        if (!request.template.content)
            throw new Error("Template must contains _id, shortid or content attribute.");

        return;
    }

    var findPromise = request.template._id ? request.context.templates.find(request.template._id) :request.context.templates.single(function (t) {
            return t.shortid === this.shortid;
        }, { shortid: request.template.shortid });

    return findPromise.then(function (template) {
        extend(true, template, request.template);
        request.template = template;
    }, function () {
        throw new Error("Unable to find specified template: " + (!request.template._id ? request.template._id : request.template.shortid));
    });
};

Templating.prototype.create = function (context, tmpl) {
    if (!tmpl) {
        tmpl = context;
        context = this.reporter.context;
    }

    var template = new this.TemplateType(tmpl);
    template.isLatest = true;
    context.templates.add(template);

    return context.templates.saveChanges().then(function () {
        return q(template);
    });
};

Templating.prototype._beforeUpdateHandler = function (args, entity) {
    entity.modificationDate = new Date();
};

Templating.prototype._beforeCreateHandler = function (args, entity) {
    if (!entity.shortid)
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

    this.TemplateHistoryType = this.reporter.dataProvider.createEntityType("TemplateHistoryType", templateAttributes);
    this.TemplateType = this.reporter.dataProvider.createEntityType("TemplateType", templateAttributes);
};

Templating.prototype._copyHistory = function (entity) {
    var self = this;

    return this.reporter.dataProvider.startContext().then(function(context) {
        return context.templates.find(entity._id).then(function (originalEntity) {
            var copy = _.extend({}, originalEntity.initData);
            delete copy._id;
            var history = new self.TemplateHistoryType(copy);
            context.templatesHistory.add(history);
            return context.templatesHistory.saveChanges();
        });
    });
};


Templating.prototype._defineEntitySets = function () {
    var self = this;

    function beforeUpdate (i) {
        return function (callback, items) {
            if (!items[0]._id)
                return callback(false);

            var shouldBeHistorized = false;

            for (var i = 0; i < items[0].changedProperties.length; i++) {
                var propName = items[0].changedProperties[i].name;
                if (propName !== "ValidationErrors" && propName !== "modificationDate")
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

    var templatesSet = this.reporter.dataProvider.registerEntitySet("templates", this.TemplateType, { tableOptions: { humanReadableKeys: [ "shortid"] } } );
    templatesSet.beforeUpdate = beforeUpdate;

    this.reporter.dataProvider.registerEntitySet("templatesHistory", this.TemplateHistoryType );

};