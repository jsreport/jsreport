var CronTime = require('cron').CronTime,
    _ = require("underscore"),
    q = require("q"),
    domain = require("domain");

var JobProcessor = module.exports = function (executionHandler, documentStore, logger, TaskType, options) {

    if (!options.taskPingTimeout)
        options.taskPingTimeout = 2 * options.interval;

    this.documentStore = documentStore;
    this.logger = logger;
    this.options = options;
    this.executionHandler = executionHandler;
    this.currentlyRunningTasks = [];
    this.TaskType = TaskType;

    options.now = options.now || function () {
        return new Date();
    };
};

JobProcessor.prototype.start = function () {
    this.interval = setInterval(JobProcessor.prototype.process.bind(this), this.options.interval);
};

JobProcessor.prototype.stop = function () {
    clearInterval(this.interval);
};

JobProcessor.prototype._schedulesToProcessFilter = function () {
    return {
        $and: [{nextRun: {$lt: this.options.now()}}, {state: "planned"}, {enabled: true}]
    };
};

JobProcessor.prototype._tasksToRecoverFilter = function () {
    return {
        $and: [{ping: {$lt: new Date(this.options.now().getTime() - this.options.taskPingTimeout)}}, {state: "running"}]
    };
};

JobProcessor.prototype._pingRunningTasks = function () {
    var ids = this.currentlyRunningTasks.map(function (t) {
        return t._id;
    });
    return this.documentStore.collection("tasks").update({_id: {$in: ids}}, {$set: {ping: this.options.now()}});
};

JobProcessor.prototype._findTasksToRecover = function () {
    var self = this;
    return this.documentStore.collection("tasks").find(self._tasksToRecoverFilter()).then(function (tasks) {
        if (tasks.length === 0)
            return [];

        return self.documentStore.collection("schedules").find({}).then(function (schedules) {
            tasks.forEach(function (t) {
                t.schedule = _.findWhere(schedules, {shortid: t.scheduleShortid});
            });

            return tasks;
        });
    });
};

JobProcessor.prototype.process = function (options) {
    var self = this;
    options = options || {};

    var d = domain.create();

    var defer = q.defer();

    d.run(function() {
        self._pingRunningTasks().then(function () {
            if (self.currentlyRunningTasks.length >= self.options.maxParallelJobs) {
                return;
            }

            return self._findTasksToRecover().then(function (tasks) {
                var promise = q.all(tasks.map(function (task) {
                    self.logger.info("Recovering task " + task.schedule.name);
                    return self.processOne(task.schedule, task);
                }));
                return options.waitForJobToFinish ? promise : q();
            }).then(function () {
                return self.documentStore.collection("schedules").find(self._schedulesToProcessFilter()).then(function (schedules) {
                    var promise = q.all(schedules.map(function (s) {
                        return self.processOne(s, null);
                    }));

                    return options.waitForJobToFinish ? promise : q();
                });
            });
        }).then(function() {
            defer.resolve();
        }).catch(function (e) {
            self.logger.error("unable to load planned schedules " + e.stack);
            defer.fail(e);
        });
    });

    return defer.promise;
};

JobProcessor.prototype.processOne = function (schedule, task) {
    var self = this;

    if (this.currentlyRunningTasks.length >= this.options.maxParallelJobs) {
        return;
    }

    return this.documentStore.collection("schedules").update({
        _id: schedule._id,
        state: "planned"
    }, {$set: {state: "planning"}}).then(function (count) {
        if (count === 1) {
            return self.execute(schedule, task);
        }
    }).catch(function (e) {
        self.logger.error("unable to update schedule state" + e.stack);
    });
};

JobProcessor.prototype.execute = function (schedule, task) {
    var self = this;

    function insertTaskIfNotExists() {
        if (!task) {
            task = {
                creationDate: self.options.now(),
                scheduleShortid: schedule.shortid,
                state: "running",
                ping: self.options.now()
            };
            self.currentlyRunningTasks.push(task);
            return self.documentStore.collection("tasks").insert(task);
        }
        self.currentlyRunningTasks.push(task);
        return q();
    }

    return insertTaskIfNotExists().then(function () {
        var cron = new CronTime(schedule.cron);
        var nextRun = cron._getNextDateFrom(new Date(schedule.nextRun.getTime() + 1000)).toDate();

        return self.documentStore.collection("schedules").update({
            _id: schedule._id
        }, {$set: {state: "planned", nextRun: new Date(nextRun.getTime())}});
    }).then(function () {
        return self.executionHandler(schedule, task).then(function () {
            self.logger.debug("Processing schedule " + schedule.name + " succeeded.");
            return self.documentStore.collection("tasks").update(
                {_id: task._id},
                {
                    $set: {
                        state: "success",
                        finishDate: self.options.now()
                    }
                });
        }).catch(function (e) {
            self.logger.debug("Processing schedule " + schedule.name + " failed with :" + e.stack);
            return self.documentStore.collection("tasks").update(
                {_id: task._id},
                {
                    $set: {
                        state: "error",
                        error: e.stack,
                        finishDate: self.options.now()
                    }
                });
        }).fin(function () {
            self.currentlyRunningTasks = _.filter(self.currentlyRunningTasks, function (t) {
                return t._id !== task._id;
            });
        });
    });
};


