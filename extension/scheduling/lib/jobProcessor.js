var CronTime = require('cron').CronTime,
    _ = require("underscore"),
    q = require("q");

var JobProcessor = module.exports = function (executionHandler, dataProvider, logger, TaskType, options) {

    if (!options.taskPingTimeout)
        options.taskPingTimeout = 2 * options.interval;

    this.dataProvider = dataProvider;
    this.logger = logger;
    this.options = options;
    this.executionHandler = executionHandler;
    this.currentlyRunningTasks = [];
    this.TaskType = TaskType;

    options.now = options.now || function() { return new Date();};
};

JobProcessor.prototype.start = function () {
    this.interval = setInterval(JobProcessor.prototype.process.bind(this), this.options.interval);
};

JobProcessor.prototype.stop = function () {
    clearInterval(this.interval);
};

JobProcessor._schedulesToProcessFilter = function (s) {
    return s.nextRun < this.now && s.state === "planned" && s.enabled === true;
};

JobProcessor._tasksToRecoverFilter = function (s) {
    return s.ping < this.treshold && s.state === "running";
};

JobProcessor.prototype._pingRunningTasks = function (context) {
    var ids = this.currentlyRunningTasks.map(function (t) {
        return t._id;
    });
    return context.tasks.rawUpdate({id: {$in: ids}}, {$set: {ping: this.options.now()}});
};

JobProcessor.prototype._findTasksToRecover = function (context) {
    var now = this.options.now();
    return context.tasks.filter(JobProcessor._tasksToRecoverFilter, {treshold: new Date(now.getTime() - this.options.taskPingTimeout)}).toArray().then(function (tasks) {
        if (tasks.length === 0)
            return [];

        return context.schedules.toArray().then(function (schedules) {
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

    if (this.currentlyRunningTasks.length >= this.options.maxParallelJobs) {
        return q();
    }

    return this.dataProvider.startContext().then(function (context) {
        return self._pingRunningTasks(context).then(function () {
            return self._findTasksToRecover(context).then(function (tasks) {
                var promise = q.all(tasks.map(function (task) {
                    self.logger.info("Recovering task " + task.schedule.name);
                    return self.processOne(task.schedule, task, context);
                }));
                return options.waitForJobToFinish ? promise : q();
            }).then(function () {
                return context.schedules.filter(JobProcessor._schedulesToProcessFilter, {now: self.options.now()}).toArray().then(function (schedules) {
                    var promise = q.all(schedules.map(function (s) {
                        return self.processOne(s, null, context);
                    }));

                    return options.waitForJobToFinish ? promise : q();
                });
            });
        });
    }).catch(function (e) {
        self.logger.error("unable to load planned schedules " + e.stack);
    });
};

JobProcessor.prototype.processOne = function (schedule, task, context) {
    var self = this;

    if (this.currentlyRunningTasks.length >= this.options.maxParallelJobs) {
        return;
    }

    return context.schedules.rawUpdate({
        _id: schedule._id,
        state: "planned"
    }, {$set: {state: "planning"}}).then(function (count) {
        if (count === 1) {
            return self.execute(schedule, task, context);
        }
    }).catch(function (e) {
        self.logger.error("unable to update schedule state" + e.stack);
    });
};

JobProcessor.prototype.execute = function (schedule, task, context) {
    var self = this;

    if (!task) {
        task = new (this.TaskType)({creationDate: this.options.now(), scheduleShortid: schedule.shortid, state: "running", ping: this.options.now()});
        context.tasks.add(task);
    }

    this.currentlyRunningTasks.push(task);

    return context.saveChanges().then(function () {
        var cron = new CronTime(schedule.cron);
        var nextRun = cron._getNextDateFrom(new Date(schedule.nextRun.getTime() + 1000)).toDate();

        return context.schedules.rawUpdate({
            _id: schedule._id
        }, {$set: {state: "planned", nextRun: new Date(nextRun.getTime())}});
    }).then(function() {
        return self.executionHandler(schedule, task, context).then(function () {
            self.logger.debug("Processing schedule " + schedule.name + " succeeded.");
            return context.tasks.rawUpdate(
                {_id: task._id},
                {
                    $set: {
                        state: "success",
                        finishDate: self.options.now()
                    }
                });
        }).catch(function (e) {
            self.logger.debug("Processing schedule " + schedule.name + " failed with :" + e.stack);
            return context.tasks.rawUpdate(
                {_id: task._id},
                {
                    $set: {
                        state: "error",
                        error: e.stack,
                        finishDate: self.options.now()
                    }
                });
        }).fin(function () {
            self.currentlyRunningTasks = _.filter(self.currentlyRunningTasks, function (task) {
                return task._id !== task._id;
            });
        });
    });
};


