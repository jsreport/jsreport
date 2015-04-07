/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension which allows to specify some sample report data for designing purposes.
 */

var shortid = require("shortid"),
    util = require("util"),
    _ = require("underscore"),
    q = require("q");

var Data = function (reporter, definition) {
    var self = this;
    this.reporter = reporter;
    this.definition = definition;

    reporter.documentStore.registerEntityType("DataItemType", {
        _id: {type: "Edm.String", key: true},
        dataJson: { type: "Edm.String" },
        name: { type: "Edm.String" },
        creationDate: { type: "Edm.DateTimeOffset" },
        shortid: { type: "Edm.String"},
        modificationDate: { type: "Edm.DateTimeOffset" }
    });

    reporter.documentStore.registerComplexType("DataItemRefType", {
        dataJson: { type: "Edm.String" },
        shortid: { type: "Edm.String" }
    });

    reporter.documentStore.registerEntitySet("data", {entityType: "jsreport.DataItemType", humanReadableKey: "shortid"});
    reporter.documentStore.model.entityTypes["TemplateType"].data = {type: "jsreport.DataItemRefType"};

    reporter.initializeListener.add("data", function () {
        var col = self.reporter.documentStore.collection("data");
        col.beforeUpdateListeners.add("data", function(query, update) {
            update.$set.modificationDate = new Date();
        });
        col.beforeInsertListeners.add("data", function (doc) {
            doc.shortid = doc.shortid || shortid.generate();
            doc.creationDate = new Date();
            doc.modificationDate = new Date();
        });
    });

    reporter.beforeRenderListeners.insert(0, definition.name, this, Data.prototype.handleBeforeRender);
};

Data.prototype.handleBeforeRender = function (request, response) {
    if (request.data) {
        this.reporter.logger.debug("Inline data specified.");
        return q();
    }

    request.data = request.data || {};

    //back compatibility
    if (!request.template.data && request.template.dataItemId) {
        request.template.data = { shortid: request.template.dataItemId};
    }

    if (!request.template.data || (!request.template.data.shortid && !request.template.data.dataJson)) {
        this.reporter.logger.debug("Data item not defined for this template.");
        return q();
    }

    var self = this;

    function findDataItem() {
        if (request.template.data.dataJson)
            return q(request.template.data);

        self.reporter.logger.debug("Searching for dataItem to apply");

        return self.reporter.documentStore.collection("data").find({ shortid: request.template.data.shortid}).then(function(items) {
            if (items.length !== 1)
                throw new Error("Data entry not found (" + request.template.data.shortid + ")");
            return items[0];
        });
    }

    return findDataItem().then(function (di) {
        if (!di)
            return;

        di = di.dataJson || di;
        request.data = JSON.parse(di);
    }).catch(function(e) {
        e.weak = true;
        throw e;
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Data(reporter, definition);
};