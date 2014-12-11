/*globals describe, it, beforeEach, afterEach*/


var assert = require("assert"),
    join = require("path").join,
    path = require("path"),
    should = require("should"),
    q = require("q"),
    JobProcessor = require("../lib/jobProcessor"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["templates", "reports", "scheduling"], function (reporter) {

    describe('for jobProcessor', function () {

        it('process should call handler and create task', function (done) {
            this.timeout(3000);
            reporter.scheduling.stop();

            reporter.dataProvider.startContext().then(function (context) {
                context.schedules.add(new reporter.scheduling.ScheduleType({
                    cron: "*/1 * * * * *"
                }));
                return context.saveChanges().then(function () {
                    var counter = 0;

                    function exec() {
                        counter++;
                        return q();
                    }

                    var jobProcessor = new JobProcessor(exec, reporter.dataProvider, reporter.logger, reporter.scheduling.TaskType, {
                        interval: 50,
                        maxParallelJobs: 1
                    });
                    return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                        return context.tasks.toArray().then(function (tasks) {
                            tasks.length.should.be.exactly(1);
                            tasks[0].state.should.be.exactly("success");
                            tasks[0].finishDate.should.be.ok;
                            done();
                        });
                    });
                });
            }).catch(done);
        });

        it('should not cross maxParallelJobs', function (done) {
            this.timeout(2000);
            reporter.scheduling.stop();

            reporter.dataProvider.startContext().then(function (context) {
                context.schedules.add(new reporter.scheduling.ScheduleType({
                    cron: "*/1 * * * * *"
                }));
                return context.saveChanges();
            }).then(function () {

                var counter = 0;

                function exec() {
                    counter++;
                    return q();
                }

                var jobProcessor = new JobProcessor(exec, reporter.dataProvider, reporter.logger, reporter.scheduling.TaskType, {
                    interval: 50,
                    maxParallelJobs: 0
                });
                return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                    counter.should.be.exactly(0);
                    done();
                });
            }).catch(done);
        });

        it('should recover failed tasks', function (done) {
            reporter.scheduling.stop();

            reporter.dataProvider.startContext().then(function (context) {
                var schedule = new reporter.scheduling.ScheduleType({
                    cron: "* * * * * 2090"
                });

                context.schedules.add(schedule);
                return context.saveChanges().then(function () {
                    context.tasks.add(new reporter.scheduling.TaskType({
                        ping: new Date(1),
                        state: "running",
                        scheduleShortid: schedule.shortid
                    }));
                    return context.saveChanges();
                }).then(function () {
                    var counter = 0;

                    function exec() {
                        counter++;
                        return q();
                    }

                    var jobProcessor = new JobProcessor(exec, reporter.dataProvider, reporter.logger, reporter.scheduling.TaskType, {
                        interval: 20,
                        maxParallelJobs: 1,
                        taskPingTimeout: 10
                    });

                    return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                        counter.should.be.exactly(1);
                        done();
                    });
                });
            }).catch(done);
        });

        it('should ping running tasks', function (done) {
            reporter.scheduling.stop();

            reporter.dataProvider.startContext().then(function (context) {
                var schedule = new reporter.scheduling.ScheduleType({
                    cron: "* * * * * 2090"
                });

                context.schedules.add(schedule);
                return context.saveChanges().then(function () {
                    var task = new reporter.scheduling.TaskType({
                        ping: new Date(new Date().getTime() - 1000),
                        state: "running",
                        scheduleShortid: schedule.shortid
                    });
                    context.tasks.add(task);
                    return context.saveChanges().then(function () {
                        var counter = 0;

                        function exec() {
                            return q();
                        }

                        var jobProcessor = new JobProcessor(exec, reporter.dataProvider, reporter.logger, reporter.scheduling.TaskType, {
                            interval: 20,
                            maxParallelJobs: 1
                        });
                        jobProcessor.currentlyRunningTasks.push(task);
                        return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                            return context.tasks.toArray().then(function (tasks) {
                                tasks[0].ping.should.not.be.exactly(task.ping);
                                done();
                            });
                        });
                    });
                });
            }).catch(done);
        });
    });
});

describe("JobProcessor._schedulesToProcessFilter", function () {
    it('should pass for planned in past and enabled', function () {
        this.now = new Date();
        JobProcessor._schedulesToProcessFilter.call(this, {
            enabled: true,
            nextRun: new Date(1),
            state: "planned"
        }).should.be.ok;
    });

    it('should skip disabled', function () {
        this.now = new Date();
        JobProcessor._schedulesToProcessFilter.call(this, {
            enabled: false,
            nextRun: new Date(1),
            state: "planned"
        }).should.not.be.ok;
    });

    it('should skip running', function () {
        this.now = new Date();
        JobProcessor._schedulesToProcessFilter.call(this, {
            enabled: true,
            nextRun: new Date(1),
            state: "running"
        }).should.not.be.ok;
    });

    it('should skip in future', function () {
        this.now = new Date();
        JobProcessor._schedulesToProcessFilter.call(this, {
            enabled: true,
            nextRun: new Date(2090, 1, 1),
            state: "running"
        }).should.not.be.ok;
    });
});


