/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension storing 5min based statistics - amount of successfully generated, amount of failures
 */

var shortid = require("shortid"),
    _ = require("underscore");

var Statistics = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.reporter.beforeRenderListeners.add(definition.name, this, Statistics.prototype.handleBeforeRender);
    this.reporter.afterRenderListeners.add(definition.name, this, Statistics.prototype.handleAfterRender);

    this._defineEntities();
};

Statistics.prototype.handleBeforeRender = function (request, response) {
    var self = this;

    var fiveMinuteDate = new Date((Math.floor(new Date().getTime() / 1000 / 60 / 5) * 1000 * 60 * 5));

    request.statistics = {
        fiveMinuteDate: fiveMinuteDate
    };

    return request.context.statistics.rawUpdate({
        fiveMinuteDate : fiveMinuteDate
    }, {
        $inc: {
            amount : 1
        },
        $set : {
            fiveMinuteDate: fiveMinuteDate
        }
    }, { upsert : true});
};

Statistics.prototype.handleAfterRender = function (request, response) {
    return request.context.statistics.rawUpdate({
        fiveMinuteDate : request.statistics.fiveMinuteDate
    }, {
        $inc: {
            success : 1
        }
    });
};


Statistics.prototype._defineEntities = function () {

    this.StatisticType = this.reporter.dataProvider.createEntityType("StatisticType", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        fiveMinuteDate: { type: "date" },
        amount: { type: "int", increment: true },
        success: { type: "int", increment: true }
    });

    this.reporter.dataProvider.registerEntitySet("statistics", this.StatisticType, { shared : true, tableOptions: { nedbPersistance: "singleFile" } });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Statistics(reporter, definition);
};