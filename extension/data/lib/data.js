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
    this.reporter = reporter;
    this.definition = definition;

    this.DataItemType = this.reporter.dataProvider.createEntityType("DataItemType", {
        _id : { type: "id", key: true, computed: true, nullable: false },
        dataJson: { type: "string" },
        name: { type: "string" },
        creationDate: { type: "date" },
        shortid: { type: "string"},
        modificationDate: { type: "date" }
    });

    this.DataItemRefType = this.reporter.dataProvider.createEntityType("DataItemRefType", {
        dataJson: { type: "string" },
        shortid: { type: "string" }
    });

    this.reporter.dataProvider.registerEntitySet("data", this.DataItemType, {  tableOptions: { humanReadableKeys: [ "shortid"] }});

    this.reporter.templates.TemplateType.addMember("data", { type: this.DataItemRefType });

    reporter.templates.TemplateType.addMember("dataItemId", { type: "string" });

    this.DataItemType.addEventListener("beforeCreate", Data.prototype._beforeCreateHandler.bind(this));
    this.DataItemType.addEventListener("beforeUpdate", Data.prototype._beforeUpdateHandler.bind(this));

    this.reporter.beforeRenderListeners.add(definition.name, this, Data.prototype.handleBeforeRender);
};

Data.prototype.handleBeforeRender = function (request, response) {
    if (request.data) {
        this.reporter.logger.debug("Inline data specified.");
        return q();
    }

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

        return request.context.data.single(function (d) {
            return d.shortid === this.id;
        }, { id: request.template.data.shortid });
    }

    return findDataItem().then(function (di) {
        di = di.dataJson || di;

        try {
            request.data = JSON.parse(di);
        } catch (e) {
            self.reporter.logger.warn("Invalid json in data item: " + e.message);
            e.weak = true;
            return q.reject(e);
        }
    });
};

Data.prototype.create = function (context, dataItem) {
    var ent = new this.DataItemType(dataItem);
    context.data.add(ent);

    return context.saveChanges().then(function () {
        return q(ent);
    });
};

Data.prototype._beforeCreateHandler = function (args, entity) {
    if (!entity.shortid)
        entity.shortid = shortid.generate();

    entity.creationDate = new Date();
    entity.modificationDate = new Date();
};

Data.prototype._beforeUpdateHandler = function (args, entity) {
    entity.modificationDate = new Date();
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Data(reporter, definition);
};