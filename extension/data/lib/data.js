/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Inline Data plugin able to add some sample data to rendering process
 */

var shortid = require("shortid"),
    util = require("util"),
    _ = require("underscore"),
    q = require("q");


module.exports = function (reporter, definition) {
    reporter[definition.name] = new Data(reporter, definition);
};

var Data = function (reporter, definition) {
    var self = this;
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

    this.reporter.dataProvider.registerEntitySet("data", this.DataItemType, { tableOptions: { humanReadableKeys: [ "shortid"] }});

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

    if (!request.data && !request.template.dataItemId && !request.template.dataItem) {
        this.reporter.logger.debug("No data specified.");
        return q();
    }

    var self = this;

    function findDataItem() {
        if (request.template.dataItem)
            return q(request.template.dataItem);

        self.reporter.logger.debug("Searching for dataItem to apply");

        return request.context.data.single(function (d) {
            return d.shortid === this.id;
        }, { id: request.template.dataItemId });
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