/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Extension capable of planning reoccurring jobs which are printing specified templates into reports.
 */

var events = require("events"),
    shortid = require("shortid"),
    util = require("util"),
    _ = require("underscore"),
    q = require("q"),
    CronTime = require('cron').CronTime,
    JobProcessor = require("./jobProcessor");

var Scheduling = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.ScheduleType = this.reporter.documentStore.registerEntityType("ScheduleType", {
        _id: {type: "Edm.String", key: true},
        cron: {type: "Edm.String"},
        name: {type: "Edm.String"},
        templateShortid: {type: "Edm.String"},
        creationDate: {type: "Edm.DateTimeOffset"},
        nextRun: {type: "Edm.DateTimeOffset"},
        shortid: {type: "Edm.String"},
        enabled: {type: "Edm.Boolean"},
        modificationDate: {type: "Edm.DateTimeOffset"},
        state: {type: "Edm.String"}
    });

    this.TaskType = this.reporter.documentStore.registerEntityType("TaskType", {
        _id: {type: "Edm.String", key: true},
        scheduleShortid: {type: "Edm.String"},
        creationDate: {type: "Edm.DateTimeOffset"},
        finishDate: {type: "Edm.DateTimeOffset"},
        state: {type: "Edm.String"},
        error: {type: "Edm.String"},
        ping: {type: "Edm.DateTimeOffset"}
    });


    this.reporter.documentStore.registerEntitySet("schedules", {entityType: "jsreport.ScheduleType", humanReadableKey: "shortid"});
    this.reporter.documentStore.model.entityTypes["ReportType"].taskId = { type: "Edm.String"};
    this.reporter.documentStore.registerEntitySet("tasks", {entityType: "jsreport.TaskType"});
    reporter.initializeListener.add(definition.name, this, Scheduling.prototype._initialize);
};

util.inherits(Scheduling, events.EventEmitter);

Scheduling.prototype._beforeCreateHandler = function (entity) {
    if (!entity.shortid)
        entity.shortid = shortid.generate();

    if (!entity.cron)
        throw new Error("cron expression must be set.");

    entity.state = "planned";
    entity.creationDate = new Date();
    entity.modificationDate = new Date();
    entity.enabled = entity.enabled !== false; //default false
    var cron = new CronTime(entity.cron);
    entity.nextRun = cron._getNextDateFrom(new Date()).toDate();
};

Scheduling.prototype._beforeUpdateHandler = function (query, update) {
    var entity = update.$set;

    if (entity.name)
        entity.modificationDate = new Date();

    if (entity.cron) {
        entity.modificationDate = new Date();
        var cron = new CronTime(entity.cron);
        entity.nextRun = cron._getNextDateFrom(new Date()).toDate();
        entity.state = "planned";
    }
};

Scheduling.prototype._initialize = function () {
    var self = this;

    this.schedulesCollection = this.reporter.documentStore.collection("schedules");
    this.schedulesCollection.beforeInsertListeners.add("schedule", Scheduling.prototype._beforeCreateHandler.bind(this));
    this.schedulesCollection.beforeUpdateListeners.add("schedule", Scheduling.prototype._beforeUpdateHandler.bind(this));
};

Scheduling.prototype.stop = function () {
    this.jobProcessor.stop();
};

Scheduling.prototype.start = function () {
    this.jobProcessor.start();
};

Scheduling.prototype.renderReport = function (schedule, task) {
    return this.reporter.render({
        template: {shortid: schedule.templateShortid},
        user : { isAdmin: true},
        options: {
            scheduling: {taskId: task._id, scheduleShortid: schedule.shortid},
            reports: {save: true, mergeProperties: {taskId: task._id}}
        }
    });
};

module.exports = function (reporter, definition) {
    if (definition.options.enabled === false)
        return;

    reporter[definition.name] = new Scheduling(reporter, definition);

    definition.options = _.extend({
        interval: 5000,
        maxParallelJobs: 5
    }, definition.options);

    reporter[definition.name].jobProcessor = new JobProcessor(Scheduling.prototype.renderReport.bind(this), reporter.documentStore, reporter.logger, reporter[definition.name].TaskType, definition.options);

    if (definition.options.autoStart !== false) {
        reporter[definition.name].start();
    }
};