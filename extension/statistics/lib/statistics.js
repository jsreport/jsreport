/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension storing 5min based statistics - amount of successfully generated, amount of failures
 */ 

var shortid = require("shortid"),
    winston = require("winston"),
    _ = require("underscore");


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
    
    this.reporter.extensionsManager.beforeRenderListeners.add(definition.name, this, Statistics.prototype.handleBeforeRender);
    this.reporter.extensionsManager.afterRenderListeners.add(definition.name, this, Statistics.prototype.handleAfterRender);
    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, Statistics.prototype.createEntitySetDefinitions);
};

Statistics.prototype.handleBeforeRender = function (request, response) {
    var self = this;

    var fiveMinuteDate = new Date((Math.floor(new Date().getTime() / 1000 / 60 / 5) * 1000 * 60 * 5));
    
    return request.context.statistics.filter(function(s) { return s.fiveMinuteDate == this.fiveMinuteDate; }, { fiveMinuteDate: fiveMinuteDate}).toArray()
        .then(function(res) {
            var stat;
            if (res.length == 0) {
                stat = new self.StatisticType({
                    amount: 1,
                    success: 0,
                    fiveMinuteDate: fiveMinuteDate,
                });
                request.context.statistics.add(stat);
            } else {
                stat = res[0];
                request.context.statistics.attach(stat);
                stat.amount++;
            }

            return request.context.statistics.saveChanges().then(function() {
                response.currentStatistic = stat;
            });
        });
};

Statistics.prototype.handleAfterRender = function (request, response) {
    request.context.statistics.attach(response.currentStatistic);
    response.currentStatistic.success++;
    return request.context.statistics.saveChanges();
};


Statistics.prototype.createEntitySetDefinitions = function (entitySets) {
    
    this.StatisticType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.Statistic"), $data.Entity, null, {
        _id: { type: "id", key: true, computed: true, nullable: false },
        fiveMinuteDate: { type: "date" },
        amount: { type: "int", increment: true },
        success: { type: "int", increment: true },
    }, null);
    
    entitySets["statistics"] = { type: $data.EntitySet, elementType: this.StatisticType };
};