/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Inline Data plugin able to add some sample data to rendering process
 */

var events = require("events"),
    shortid = require("shortid"),
    util = require("util"),
    _ = require("underscore"),
    q = require("q"),
    CronJob = require('cron').CronJob,
    CronTime = require('cron').CronTime;

var Scheduling = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;
    this.jobs = {};

    this.ScheduleType = this.reporter.dataProvider.createEntityType("ScheduleType", {
        _id: {type: "id", key: true, computed: true, nullable: false},
        cron: {type: "string"},
        name: {type: "string"},
        templateShortid: {type: "string"},
        creationDate: {type: "date"},
        nextRun: {type: "date"},
        shortid: {type: "string"},
        enabled: {type: "bool"},
        modificationDate: {type: "date"}
    });

    this.TaskType = this.reporter.dataProvider.createEntityType("TaskType", {
        _id: {type: "id", key: true, computed: true, nullable: false},
        scheduleShortid: {type: "string"},
        creationDate: {type: "date"},
        finishDate: {type: "date"},
        state: {type: "string"},
        error: {type: "string"}
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
    successResult = Array.isArray(successResult) ? successResult : [successResult];

    successResult.forEach(function (i) {
        var cron = new CronTime(i.cron);
        i.nextRun = i.enabled ? cron._getNextDateFrom(new Date()) : null;
    });

    return true;
};

Scheduling.prototype._beforeCreateHandler = function (key, items) {
    var entity = items[0];
    if (!entity.shortid)
        entity.shortid = shortid.generate();

    entity.creationDate = new Date();
    entity.modificationDate = new Date();
    entity.enabled = entity.enabled !== false; //default false

    if (!this.suspendAutoRegistration) {
        try {
            this._registerJob(entity);
        }
        catch (e) {
            return false;
        }
    }
    return true;
};

Scheduling.prototype._beforeUpdateHandler = function (key, items) {
    var entity = items[0];
    entity.modificationDate = new Date();

    if (!this.suspendAutoRegistration) {
        try {
            this._registerJob(entity);
        }
        catch (e) {
            return false;
        }
    }
    return true;
};

Scheduling.prototype._beforeDeleteHandler = function (key, items) {
    var entity = items[0];

    if (this.jobs[entity.shortid])
        this.jobs[entity.shortid].stop();

    return true;
};

Scheduling.prototype._initialize = function () {
    var self = this;

    for (var job in this.jobs) {
        if (this.jobs.hasOwnProperty(job)) {
            this.jobs[job].stop();
        }
    }
    this.jobs = {};

    return this.reporter.dataProvider.startContext().then(function (context) {
        return context.schedules.toArray().then(function (schedules) {
            schedules.forEach(Scheduling.prototype._registerJob.bind(self));
        });
    });
};

Scheduling.prototype._processSchedule = function (schedule) {
    this.reporter.logger.debug("Processing schedule " + schedule.name);
    this.emit("process", schedule);
    var self = this;

    return this.reporter.dataProvider.startContext().then(function (context) {
        var task = new self.TaskType({creationDate: new Date(), scheduleShortid: schedule.shortid, state: "running"});
        context.tasks.add(task);
        return context.saveChanges().then(function () {
            return context.tasks.single(function (t) {
                return t._id === this._id;
            }, {_id: task._id}).then(function (task) {
                return self.reporter.render({
                    template: {shortid: schedule.templateShortid},
                    options: {
                        scheduling: {taskId: task._id, scheduleShortid: schedule.shortid},
                        reports: {save: true, mergeProperties: {taskId: task._id}},
                        isRootRequest: true
                    }
                }).then(function () {
                    self.reporter.logger.debug("Processing schedule " + schedule.name + " succeeded.");
                    context.tasks.attach(task);
                    task.finishDate = new Date();
                    task.state = "success";
                    return context.saveChanges();
                }).catch(function (e) {
                    self.reporter.logger.debug("Processing schedule " + schedule.name + " failed with :" + e.stack);
                    context.tasks.attach(task);
                    task.finishDate = new Date();
                    task.state = "error";
                    task.error = e.stack;
                    return context.saveChanges();
                });
            });
        });
    });
};

Scheduling.prototype._registerJob = function (schedule) {
    if (this.jobs[schedule.shortid])
        this.jobs[schedule.shortid].stop();

    if (!schedule.enabled) {
        return;
    }

    var self = this;
    var job = new CronJob(schedule.cron, function () {
            self._processSchedule(schedule);
        }, function () {
            // This function is executed when the job stops
        }
    );
    self.jobs[schedule.shortid] = job;
    job.start();
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Scheduling(reporter, definition);
};