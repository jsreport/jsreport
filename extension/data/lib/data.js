/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Inline Data plugin able to add some sample data to rendering process
 */ 

var shortid = require("shortid"),
    util = require("util"),
    sformat = require("stringformat"),
    _ = require("underscore"),
    Q = require("q");


module.exports = function (reporter, definition) {
    reporter[definition.name] = new Data(reporter, definition);
};

Data = function (reporter, definition) {
    var self = this;
    this.reporter = reporter;
    this.definition = definition;
    
    this.DataItemType = $data.Class.define(reporter.extendGlobalTypeName("$entity.DataItem"), $data.Entity, null, {
        dataJson: { type: "string" },
        name: { type: "string" },
        creationDate: { type: "date" },
        shortid: { type: "string"},
        modificationDate: { type: "date" },
    }, null);
    
    if (this.reporter.playgroundMode) {
        reporter.templates.TemplateType.addMember("dataItem", { type:  this.DataItemType });
    } else {
        this.DataItemType.addMember("_id", { type: "id", key: true, computed: true, nullable: false });
        reporter.templates.TemplateType.addMember("dataItemId", { type: "string" });
    }
    
    this.DataItemType.addEventListener("beforeCreate", Data.prototype._beforeCreateHandler.bind(this));
    this.DataItemType.addEventListener("beforeUpdate", Data.prototype._beforeUpdateHandler.bind(this));
    
    this.reporter.beforeRenderListeners.add(definition.name, this, Data.prototype.handleBeforeRender);
    this.reporter.entitySetRegistrationListners.add(definition.name, this, function(entitySets) {
        if (!self.reporter.playgroundMode) 
            entitySets["data"] = { type: $data.EntitySet, elementType: self.DataItemType, tableOptions: { humanReadableKeys: [ "shortid"] }  };
    });
};

Data.prototype.handleBeforeRender = function (request, response) {
    
    if (request.data || (!request.template.dataItemId && !(request.template.dataItem != null && request.template.dataItem.dataJson))) {
        this.reporter.logger.info("DateItem not defined for this template.");
        return Q();
    }

    var self = this;

    function FindDataItem() {
        if (request.template.dataItem != null && request.template.dataItem != "")
            return Q(request.template.dataItem);

        self.reporter.logger.info("Searching for before dataItem to apply");

        return request.context.data.single(function(d) { return d.shortid == this.id; }, { id: request.template.dataItemId } );
    };

    return FindDataItem().then(function(di) {
        di = di.dataJson || di;

        try {
            request.data = JSON.parse(di);
        } catch(e) {
            self.reporter.logger.warn("Invalid json in data item: " + e.message);
            e.weak = true;
            return Q.reject(e);
        }
    });
};

Data.prototype.create = function (context, dataItem) {
    var ent = new this.DataItemType(dataItem);
    context.data.add(ent);
    
    return context.saveChanges().then(function() { return Q(ent); });
};

Data.prototype._beforeCreateHandler = function(args, entity) {
     if (entity.shortid == null)
        entity.shortid = shortid.generate();
    
    entity.creationDate = new Date();
    entity.modificationDate = new Date();
};

Data.prototype._beforeUpdateHandler = function(args, entity) {
     entity.modificationDate = new Date();
};