var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    events = require("events"),
    util = require("util"),
    sformat = require("stringformat"),
    async = require("async"),
    _ = require("underscore"),
    Q = require("q");
    sformat = require("stringformat");


var logger = winston.loggers.get('jsreport');

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Data(reporter, definition);
};

Data = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;
    
    Object.defineProperty(this, "entitySet", {
        get: function () {
            return reporter.context.data;
        }
    });
    
    this.DataItemType = $data.Class.define(reporter.extendGlobalTypeName("$entity.DataItem"), $data.Entity, null, {
        dataJson: { type: "string" },
        name: { type: "string" },
        shortid: { type: "string"}
    }, null);
    
    if (this.reporter.playgroundMode) {
        reporter.templates.TemplateType.addMember("dataItem", { type:  this.DataItemType });
    } else {
        this.DataItemType.addMember("_id", { type: "id", key: true, computed: true, nullable: false });
        reporter.templates.TemplateType.addMember("dataItemId", { type: "id" });
    }
    
    this.DataItemType.addEventListener("beforeCreate", Data.prototype._beforeCreateHandler.bind(this));
    this.reporter.extensionsManager.beforeRenderListeners.add(definition.name, this, Data.prototype.handleBeforeRender);
    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, createEntitySetDefinitions);
};

Data.prototype.handleBeforeRender = function (request, response) {
    
    if (!request.template.dataItemId && !request.template.dataItem) {
        logger.info("DateItem not defined for this template.");
        return;
    }

    var self = this;

    function FindDataItem() {
        if (request.template.dataItem != null && request.template.dataItem != "")
            return Q(request.template.dataItem);

        logger.info("Searching for before dataItem to apply");

        return self.entitySet.find(request.template.dataItemId);
    };

    return FindDataItem().then(function(di) {
        di = di.dataJson || di;
        request.data = JSON.parse(di);
    });
};

Data.prototype.create = function (dataItem) {
    logger.info(sformat("Creating dataItem {0}.", dataItem.name));

    var ent = new this.DataItemType(dataItem);
    this.entitySet.add(ent);
    
    return this.entitySet.saveChanges().then(function() { return Q(ent); });
};

Data.prototype._beforeCreateHandler = function(args, entity) {
     if (entity.shortid == null)
        entity.shortid = shortid.generate();
};

function createEntitySetDefinitions(entitySets, next) {
    if (!this.reporter.playgroundMode) {
        entitySets["data"] = { type: $data.EntitySet, elementType: this.DataItemType };
    }

    next();
};

