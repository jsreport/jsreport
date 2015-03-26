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

            reporter.documentStore.collection("schedules").insert({
                cron: "*/1 * * * * *"
            }).then(function () {
                var counter = 0;

                function exec() {
                    counter++;
                    return q();
                }

                var jobProcessor = new JobProcessor(exec, reporter.documentStore, reporter.logger, reporter.scheduling.TaskType, {
                    interval: 50,
                    maxParallelJobs: 1
                });
                return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                    return reporter.documentStore.collection("tasks").find({}).then(function (tasks) {
                        tasks.length.should.be.exactly(1);
                        tasks[0].state.should.be.exactly("success");
                        tasks[0].finishDate.should.be.ok;
                        done();
                    });
                });
            }).catch(done);
        });

        it('should not cross maxParallelJobs', function (done) {
            this.timeout(2000);
            reporter.scheduling.stop();

            reporter.documentStore.collection("schedules").insert({
                cron: "*/1 * * * * *"
            }).then(function () {

                var counter = 0;

                function exec() {
                    counter++;
                    return q();
                }

                var jobProcessor = new JobProcessor(exec, reporter.documentStore, reporter.logger, reporter.scheduling.TaskType, {
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

            reporter.documentStore.collection("schedules").insert({
                cron: "* * * * * 2090"
            }).then(function (schedule) {
                reporter.documentStore.collection("tasks").insert({
                    ping: new Date(1),
                    state: "running",
                    scheduleShortid: schedule.shortid
                });
            }).then(function () {
                var counter = 0;

                function exec() {
                    counter++;
                    return q();
                }

                var jobProcessor = new JobProcessor(exec, reporter.documentStore, reporter.logger, reporter.scheduling.TaskType, {
                    interval: 20,
                    maxParallelJobs: 1,
                    taskPingTimeout: 10
                });

                return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                    counter.should.be.exactly(1);
                    done();
                });
            }).catch(done);
        });

        it('should ping running tasks', function (done) {
            reporter.scheduling.stop();

            reporter.documentStore.collection("schedules").insert({
                cron: "* * * * * 2090"
            }).then(function (schedule) {
                return reporter.documentStore.collection("tasks").insert({
                    ping: new Date(new Date().getTime() - 1000),
                    state: "running",
                    scheduleShortid: schedule.shortid
                }).then(function (task) {

                    var counter = 0;

                    function exec() {
                        return q();
                    }

                    var jobProcessor = new JobProcessor(exec, reporter.documentStore, reporter.logger, reporter.scheduling.TaskType, {
                        interval: 20,
                        maxParallelJobs: 1
                    });
                    jobProcessor.currentlyRunningTasks.push(task);
                    return jobProcessor.process({waitForJobToFinish: true}).then(function () {
                        return reporter.documentStore.collection("tasks").find({}).then(function (tasks) {
                            tasks[0].ping.should.not.be.exactly(task.ping);
                            done();
                        });
                    });
                });
            }).catch(done);
        });
    });
});

