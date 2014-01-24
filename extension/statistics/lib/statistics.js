var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    events = require("events"),
    util = require("util"),
    sformat = require("stringformat"),
    async = require("async"),
    _ = require("underscore"),
    moment = require("moment");


var logger = winston.loggers.get('jsreport');

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Statistics(reporter, definition);
};

Statistics = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    Object.defineProperty(this, "entitySet", {
        get: function () {
            return reporter.context.statistics;
        }
    });
    
    this.reporter.extensionsManager.afterRenderListeners.add(definition.name, this, Statistics.prototype.handleAfterRender);
    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, Statistics.prototype.createEntitySetDefinitions);
};

Statistics.prototype.handleAfterRender = function (request, response) {
    var self = this;
    var now = new Date();
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dayAfter = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var dayBefore = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    
    if (!request.options.async)
        return;

    var context = this.reporter.startContext();
    
    return context.statistics.filter(function (s) {
        return s.day > this.dayBefore && s.day < this.dayAfter && s.templateShortid == this.templateShortid;
    }, { dayAfter: dayAfter, dayBefore: dayBefore, templateShortid: request.template.shortid }).toArray()
        .then(function(res) {
            if (res.length == 0) {
                logger.info("Creating new stats");
                var stat = new self.StatisticType({
                    day: day,
                    amount: 1,
                    templateShortid: request.template.shortid,
                    templateName: request.template.name
                });
                context.statistics.add(stat);
            } else {
                logger.info("Updating existing stats");
                context.statistics.attach(res[0]);
                res[0].amount++;
            }

            return context.statistics.saveChanges();
        });
};

Statistics.prototype.createEntitySetDefinitions = function (entitySets, next) {
    
    this.StatisticType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.Statistic"), $data.Entity, null, {
        _id: { type: "id", key: true, computed: true, nullable: false },
        day: { type: "date" },
        amount: { type: "int" },
        templateName: { type: "string" },
        templateShortid: { type: "string" },
    }, null);
    
    entitySets["statistics"] = { type: $data.EntitySet, elementType: this.StatisticType };

    next();
};