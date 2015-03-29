/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension storing 5min based statistics - amount of successfully generated, amount of failures
 */

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

    return this.reporter.documentStore.collection("statistics").update({
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
    return this.reporter.documentStore.collection("statistics").update({
        fiveMinuteDate : request.statistics.fiveMinuteDate
    }, {
        $inc: {
            success : 1
        }
    });
};


Statistics.prototype._defineEntities = function () {

    this.reporter.documentStore.registerEntityType("StatisticType", {
        _id: {type: "Edm.String", key: true},
        fiveMinuteDate: { type: "Edm.DateTimeOffset" },
        amount: { type: "Edm.Int64" },
        success: { type: "Edm.Int64" }
    });

    this.reporter.documentStore.registerEntitySet("statistics",  {entityType: "jsreport.StatisticType", shared: true});
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Statistics(reporter, definition);
};