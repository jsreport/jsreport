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

    this.ScheduleType = this.reporter.dataProvider.createEntityType("ScheduleType", {
        _id: {type: "id", key: true, computed: true, nullable: false},
        cron: {type: "string"},
        name: {type: "string"},
        templateShortid: {type: "string"},
        creationDate: {type: "date"},
        nextRun: {type: "date"},
        shortid: {type: "string"},
        enabled: {type: "bool"},
        modificationDate: {type: "date"},
        state: {type: "string"}
    });

    this.TaskType = this.reporter.dataProvider.createEntityType("TaskType", {
        _id: {type: "id", key: true, computed: true, nullable: false},
        scheduleShortid: {type: "string"},
        creationDate: {type: "date"},
        finishDate: {type: "date"},
        state: {type: "string"},
        error: {type: "string"},
        ping: {type: "date"}
    });

    var schedulesSet = this.reporter.dataProvider.registerEntitySet("schedules", this.ScheduleType, {tableOptions: {humanReadableKeys: ["shortid"]}});
    schedulesSet.beforeCreateListeners.add("schedule-before-create", Scheduling.prototype._beforeCreateHandler.bind(this));
    schedulesSet.beforeUpdateListeners.add("schedule-before-update", Scheduling.prototype._beforeUpdateHandler.bind(this));
    schedulesSet.beforeDeleteListeners.add("schedule-before-delete", Scheduling.prototype._beforeDeleteHandler.bind(this));
    schedulesSet.afterReadListeners.add("schedule-after-read", Scheduling.prototype._afterReadHandler.bind(this));

    this.reporter.dataProvider.registerEntitySet("tasks", this.TaskType, {tableOptions: {nedbPersistance: "singleFile"}});

    this.reporter.reports.ReportType.addMember("taskId", {type: "id"});

    reporter.initializeListener.add(definition.name, this, Scheduling.prototype._initialize);
};

util.inherits(Scheduling, events.EventEmitter);

Scheduling.prototype._afterReadHandler = function (key, successResult, sets, query) {
    return true;
};

Scheduling.prototype._beforeCreateHandler = function (key, items) {
    var entity = items[0];
    if (!entity.shortid)
        entity.shortid = shortid.generate();

    if (!entity.cron)
        return false;

    entity.state = "planned";
    entity.creationDate = new Date();
    entity.modificationDate = new Date();
    entity.enabled = entity.enabled !== false; //default false
    var cron = new CronTime(entity.cron);
    entity.nextRun = cron._getNextDateFrom(new Date()).toDate();
    return true;
};

Scheduling.prototype._beforeUpdateHandler = function (key, items) {
    var entity = items[0];
    entity.modificationDate = new Date();

    if (!entity.cron)
        return false;

    var cron = new CronTime(entity.cron);
    entity.nextRun = cron._getNextDateFrom(new Date()).toDate();
    entity.state = "planned";

    return true;
};

Scheduling.prototype._beforeDeleteHandler = function (key, items) {
    var entity = items[0];
    return true;
};

Scheduling.prototype._initialize = function () {
    var self = this;
};

Scheduling.prototype.stop = function () {
    this.jobProcessor.stop();
};

Scheduling.prototype.start = function () {
    this.jobProcessor.start();
};

Scheduling.prototype.renderReport = function (schedule, task, context) {
    return this.reporter.render({
        template: {shortid: schedule.templateShortid},
        user : { isAdmin: true},
        options: {
            scheduling: {taskId: task._id, scheduleShortid: schedule.shortid},
            reports: {save: true, mergeProperties: {taskId: task._id}},
            isRootRequest: true
        }
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Scheduling(reporter, definition);

    definition.options = _.extend({
        interval: 5000,
        maxParallelJobs: 5
    }, definition.options);

    reporter[definition.name].jobProcessor = new JobProcessor(Scheduling.prototype.renderReport.bind(this), reporter.dataProvider, reporter.logger, reporter[definition.name].TaskType, definition.options);

    if (definition.options.autoStart !== false) {
        reporter[definition.name].start();
    }
};