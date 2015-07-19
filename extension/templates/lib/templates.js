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
    this.reporter = reporter;  this.definition = definition;
    this.documentStore = reporter.documentStore;

    this._defineEntities();

    this.reporter.beforeRenderListeners.add(definition.name, Templating.prototype.handleBeforeRender.bind(this));
    this.reporter.on("express-configure", Templating.prototype._configureExpress.bind(this));
};

util.inherits(Templating, events.EventEmitter);

Templating.prototype.handleBeforeRender = function (request) {
    var self = this;

    if (!request.template._id && !request.template.shortid && !request.template.name) {
        if (!request.template.content)
            throw new Error("Template must contains _id, shortid or content attribute.");

        self.reporter.logger.info("Rendering anonymous template { recipe:" +
            request.template.recipe + ",engine:" + request.template.engine + "}");

        return;
    }



    function findTemplate() {

        function findQuery() {
            if (request.template._id) {
                return { _id:  request.template._id };
            }

            if (request.template.shortid) {
                return { shortid:  request.template.shortid };
            }

            if (request.template.name) {
                return { name:  request.template.name };
            }
        }

        var query = findQuery();

        if (!query) {
            return q([request.template]);
        }

        return self.documentStore.collection("templates").find(query);
    }

    return findTemplate().then(function (templates) {
        if (templates.length !== 1)
            throw new Error("Unable to find specified template: " + (request.template._id || request.template.shortid || request.template.name));

        extend(true, templates[0], request.template);
        request.template = templates[0];
        request.template.content = request.template.content || "";
        self.reporter.logger.info("Rendering template {shortid:" + request.template.shortid + ", recipe:" +
            request.template.recipe + ",engine:" + request.template.engine + "}");
    }).catch(function (e) {
        throw new Error("Unable to find specified template: " + (request.template._id ? request.template._id : request.template.shortid + " " + e.stack));
    });
};

Templating.prototype._configureExpress = function (app) {
    var self = this;

    app.get("/templates/:shortid", function (req, res, next) {
        self.documentStore.collection("templates").find({
            shortid: req.params.shortid
        }).then(function (templates) {
            if (templates.length !== 1)
                return q.reject(new Error("Unauthorized"));

            req.template = templates[0];

            return self.reporter.render(req).then(function (response) {

                if (response.headers) {
                    for (var key in response.headers) {
                        if (response.headers.hasOwnProperty(key))
                            res.setHeader(key, response.headers[key]);
                    }
                }


                response.stream.pipe(res);
            });
        }).catch(function (e) {
            next(e);
        });
    });
};


Templating.prototype._beforeUpdateHandler = function (query, update) {
    var self = this;
    update.$set.modificationDate = new Date();

    return this.documentStore.collection("templates").find({_id: query._id}).then(function (res) {
        var copy = _.extend({}, res[0]);
        delete copy._id;
        return self.documentStore.collection("templatesHistory").insert(copy);
    });
};

Templating.prototype._defineEntities = function () {
    var templateAttributes = {
        _id: {type: "Edm.String", key: true},
        shortid: {type: "Edm.String"},
        name: {type: "Edm.String"},
        content: {type: "Edm.String"},
        recipe: {type: "Edm.String"},
        helpers: {type: "Edm.String"},
        engine: {type: "Edm.String"},
        modificationDate: {type: "Edm.DateTimeOffset"}
    };


    this.documentStore.registerEntityType("TemplateHistoryType", templateAttributes);
    this.documentStore.registerEntityType("TemplateType", templateAttributes);
    this.documentStore.registerEntitySet("templates", {entityType: "jsreport.TemplateType", humanReadableKey: "shortid"});
    this.documentStore.registerEntitySet("templatesHistory", {entityType: "jsreport.TemplateHistoryType"});

    var self = this;
    this.reporter.initializeListener.add("templates", function () {
        var col = self.documentStore.collection("templates");
        col.beforeUpdateListeners.add("templates", Templating.prototype._beforeUpdateHandler.bind(self));
        col.beforeInsertListeners.add("templates", function (doc) {
            doc.shortid = doc.shortid || shortid.generate();
            doc.modificationDate = new Date();
        });
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Templating(reporter, definition);
};