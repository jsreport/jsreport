/*globals describe, it, beforeEach, afterEach*/


var assert = require("assert"),
    join = require("path").join,
    path = require("path"),
    should = require("should"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["html", "templates", "reports", "scheduling"], function (reporter) {

    describe('with scheduling extension', function () {

        it('creating schedule should add default values', function (done) {
            this.timeout(3500);

            var schedule = new reporter.scheduling.ScheduleType({
                cron: "*/1 * * * * *",
                templateShortid: "foo"
            });

            reporter.dataProvider.startContext().then(function (context) {
                    context.schedules.add(schedule);
                    return context.saveChanges();
            }).then(function () {
                schedule.nextRun.should.be.ok;
                schedule.creationDate.should.be.ok;
                schedule.state.should.be.exactly("planned");
                done();
            }).fail(done);
        });


        it('updating schedule should recalculate nextRun', function (done) {
            this.timeout(3500);

            var schedule = new reporter.scheduling.ScheduleType({
                cron: "*/1 * * * * *",
                templateShortid: "foo"
            });

            reporter.dataProvider.startContext().then(function (context) {
                context.schedules.add(schedule);
                return context.saveChanges().then(function () {
                    context.schedules.attach(schedule);
                    schedule.nextRun = new Date(1);
                    return context.schedules.saveChanges();
                });
            }).then(function () {
                schedule.nextRun.should.not.be.exactly(new Date(1));
                done();
            }).fail(done);
        });

        it('render process job should render report', function (done) {
            this.timeout(3500);

            var counter = 0;

            reporter.beforeRenderListeners.insert(0, "test init", this, function (request, response) {
                counter++;
            });

            reporter.dataProvider.startContext().then(function (context) {
                return reporter.templates.create(context, {content: "foo"}).then(function (template) {
                    return reporter.scheduling.renderReport({ templateShortid: template.shortid }, context).then(function () {
                        counter.should.be.exactly(1);
                        done();
                    });
                });
            }).catch(done);
        });
    });
});

