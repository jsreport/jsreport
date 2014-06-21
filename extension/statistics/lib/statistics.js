/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension storing 5min based statistics - amount of successfully generated, amount of failures
 */

var shortid = require("shortid"),
    _ = require("underscore");

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Statistics(reporter, definition);
};

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

    return request.context.statistics.filter(function (s) {
        return s.fiveMinuteDate === this.fiveMinuteDate;
    }, { fiveMinuteDate: fiveMinuteDate}).toArray()
        .then(function (res) {
            var stat;
            if (res.length === 0) {
                stat = new self.StatisticType({
                    amount: 1,
                    success: 0,
                    fiveMinuteDate: fiveMinuteDate
                });
                request.context.statistics.add(stat);
            } else {
                stat = res[0];
                request.context.statistics.attach(stat);
                stat.amount++;
            }

            return request.context.statistics.saveChanges().then(function () {
                response.currentStatistic = stat;
            });
        });
};

Statistics.prototype.handleAfterRender = function (request, response) {
    request.context.statistics.attach(response.currentStatistic);
    response.currentStatistic.success++;
    return request.context.statistics.saveChanges();
};


Statistics.prototype._defineEntities = function () {

    this.StatisticType = this.reporter.dataProvider.createEntityType("StatisticType", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        fiveMinuteDate: { type: "date" },
        amount: { type: "int", increment: true },
        success: { type: "int", increment: true }
    });

    this.reporter.dataProvider.registerEntitySet("statistics", this.StatisticType, { tableOptions: { nedbPersistance: "singleFile" } });
};