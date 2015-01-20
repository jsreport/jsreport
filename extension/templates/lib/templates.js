/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Core extension responsible for storing, versioning and loading report templates for render request..
 */

var stream = require("stream"),
    shortid = require("shortid"),
    uuid = require("uuid").v1,
    events = require("events"),
    util = require("util"),
    _ = require("underscore"),
    q = require("q"),
    fs = require("fs"),
    S = require("string"),
    extend = require("node.extend");

var Templating = function (reporter, definition) {
    this.name = "templates";
    this.reporter = reporter;
    this.definition = definition;

    this._defineEntities();

    this.TemplateType.addEventListener("beforeCreate", Templating.prototype._beforeCreateHandler.bind(this));
    this.TemplateType.addEventListener("beforeUpdate", Templating.prototype._beforeUpdateHandler.bind(this));

    this.reporter.beforeRenderListeners.add(definition.name, Templating.prototype.handleBeforeRender.bind(this));

    this._defineEntitySets();

    this.reporter.on("express-configure", Templating.prototype._configureExpress.bind(this));
};

util.inherits(Templating, events.EventEmitter);

Templating.prototype.handleBeforeRender = function (request, response) {
    var self = this;

    if (!request.template._id && !request.template.shortid) {
        if (!request.template.content)
            throw new Error("Template must contains _id, shortid or content attribute.");

        return;
    }

    function findTemplate() {
        if (!request.template._id && !request.template.shortid) {
            return q(request.template);
        }

        return self.reporter.dataProvider.startContext().then(function (context) {
            if (request.template._id) {
                return context.templates.find(request.template._id);
            }

            if (request.template.shortid) {
                return context.templates.single(function (t) {
                    return t.shortid === this.shortid;
                }, {shortid: request.template.shortid});
            }
        });
    }


    return findTemplate().then(function (template) {
        extend(true, template, request.template);
        request.template = template;
        request.template.content = request.template.content || "";
    }, function () {
        throw new Error("Unable to find specified template: " + (request.template._id ? request.template._id : request.template.shortid));
    });
};

Templating.prototype.create = function (context, tmpl) {
    if (!tmpl) {
        tmpl = context;
        context = this.reporter.context;
    }

    var template = new this.TemplateType(tmpl);
    template.isLatest = true;
    template.recipe = template.recipe || "html";
    template.engine = template.engine || "jsrender";

    context.templates.add(template);

    return context.templates.saveChanges().then(function () {
        return q(template);
    });
};

Templating.prototype._configureExpress = function (app) {
    var self = this;

    app.get("/templates/:shortid", function (req, res, next) {
        self.reporter.dataProvider.startContext().then(function (context) {
            return context.templates.filter(function (t) {
                return t.shortid === this.shortid;
            }, {shortid: req.params.shortid})
                .toArray().then(function (templates) {
                    if (templates.length !== 1)
                        return q.reject(new Error("Unauthorized"));
                    var template = templates[0];

                    req.template = template;

                    return self.reporter.render(req).then(function (response) {

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
        _id: {type: "id", key: true, computed: true, nullable: false},
        shortid: {type: "string"},
        name: {type: "string"},
        content: {type: "string"},
        recipe: {type: "string"},
        helpers: {type: "string"},
        engine: {type: "string"},
        modificationDate: {type: "date"}
    };


    this.TemplateHistoryType = this.reporter.dataProvider.createEntityType("TemplateHistoryType", templateAttributes);
    this.TemplateType = this.reporter.dataProvider.createEntityType("TemplateType", templateAttributes);
};

Templating.prototype._copyHistory = function (entity) {
    var self = this;

    return this.reporter.dataProvider.startContext().then(function (context) {
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

    var templatesSet = this.reporter.dataProvider.registerEntitySet("templates", this.TemplateType, {tableOptions: {humanReadableKeys: ["shortid"]}});

    templatesSet.beforeUpdateListeners.add("templates-before-update", function (key, items) {
        if (!items[0]._id)
            return q(false);

        var shouldBeHistorized = false;

        for (var i = 0; i < items[0].changedProperties.length; i++) {
            var propName = items[0].changedProperties[i].name;
            if (propName !== "ValidationErrors" && propName !== "modificationDate")
                shouldBeHistorized = true;
        }

        if (!shouldBeHistorized)
            return q(true);

        return self._copyHistory(items[0]).then(function () {
            return true;
        }, function (err) {
            return false;
        });
    });

    this.reporter.dataProvider.registerEntitySet("templatesHistory", this.TemplateHistoryType);
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Templating(reporter, definition);
};