/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 *
 */

var q = require("q"),
    S = require("string");

var Resources = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.reporter.beforeRenderListeners.insert({ after: "data", before: "scripts" }, definition.name, this, Resources.prototype.handleBeforeRender);
    this._defineEntities();
};

Resources.prototype.handleBeforeRender = function (request, response) {

    if (!request.template.resources || !request.template.resources.items || request.template.resources.items.length < 1) {
        this.reporter.logger.debug("Resources not defined for this template.");
        return;
    }

    var self = this;

    return q.all(request.template.resources.items.map(function(r) {
        return self.reporter.documentStore.collection(r.entitySet).find({ shortid: r.shortid}).then(function(res) {
            if (res.length < 1)
                throw new Error("Data item with shortid " + r.shortid + " was not found.");

            return res[0];
        });
    })).then(function(resources) {
        resources.forEach(function(r) {
            r.data = JSON.parse(r.dataJson);
        });

        request.options.resources = resources;
        request.data["$resources"] = resources;

        var resourcesByName = {};
        resources.forEach(function(r) {
            resourcesByName[r.name] = r.data;
        });

        request.options.resource = resourcesByName;
        request.data["$resource"] = resourcesByName;

        if (request.options.language || (request.template.resources && request.template.resources.defaultLanguage)) {
            var applicableResources = resources.filter(function(r) {
                return S(r.name).startsWith(request.options.language + "-");
            });

            self.reporter.logger.debug("Found " + applicableResources.length + " applicable resources.");

            if (!applicableResources.length && request.template.resources && request.template.resources.defaultLanguage) {
                applicableResources = resources.filter(function(r) {
                    return S(r.name).startsWith(request.template.resources.defaultLanguage + "-");
                });
            }

            request.options.localizedResources = applicableResources;
            request.data["$localizedResources"] = applicableResources;

            var localizedResourceByName = {};
            applicableResources.forEach(function(r) {
                localizedResourceByName[r.name.substring((request.options.language + "-").length)] = r.data;
            });

            request.options.localizedResource = applicableResources.length === 1 ?  applicableResources[0].data : localizedResourceByName;
            request.data["$localizedResource"] = request.options.localizedResource;
        }
    });
};

Resources.prototype._defineEntities = function () {
    this.reporter.documentStore.registerComplexType("ResourceRefType", {
        shortid: { type: "Edm.String" },
        entitySet: { type: "Edm.String"}
    });

    this.reporter.documentStore.registerComplexType("ResourcesType", {
        items: { type: "Collection(jsreport.ResourceRefType)" },
        defaultLanguage: { type: "Edm.String"}
    });

    this.reporter.documentStore.model.entityTypes["TemplateType"].resources = {type: "jsreport.ResourcesType"};
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Resources(reporter, definition);
};