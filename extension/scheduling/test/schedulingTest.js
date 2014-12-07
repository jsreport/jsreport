/*globals describe, it, beforeEach, afterEach*/


var assert = require("assert"),
    join = require("path").join,
    path = require("path"),
    should = require("should"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["html", "templates", "reports", "scheduling"], function (reporter) {

    describe('with scheduling extension', function () {

        it('creating schedule should plan it', function (done) {
            this.timeout(3500);

            var requests = [];

            reporter.beforeRenderListeners.insert(0, "test", this, function (request, response) {
                requests.push(request);
            });

            reporter.dataProvider.startContext().then(function (context) {
                return reporter.templates.create(context, {content: "foo", shortid: "foo"}).then(function () {
                    context.schedules.add(new reporter.scheduling.ScheduleType({
                        cron: "* * * * * *",
                        templateShortid: "foo"
                    }));
                    return context.saveChanges();
                });
            }).then(function () {
                setTimeout(function () {

                    requests.length.should.be.exactly(2);
                    requests[0].options.scheduling.taskId.should.be.ok;
                    requests[0].template.shortid.should.be.exactly("foo");

                    done();
                }, 2500);
            }).catch(done);
        });

        it('init schedule should plan it', function (done) {
            this.timeout(3500);

            var counter = 0;

            reporter.beforeRenderListeners.insert(0, "test init", this, function (request, response) {
                counter++;
            });

            reporter.scheduling.suspendAutoRegistration = true;

            reporter.dataProvider.startContext().then(function (context) {
                return reporter.templates.create(context, {content: "foo", shortid: "foo"}).then(function () {
                    context.schedules.add(new reporter.scheduling.ScheduleType({
                        cron: "* * * * * *",
                        templateShortid: "foo"
                    }));
                    return context.saveChanges();
                });
            }).then(function () {
                return reporter.scheduling._initialize();
            }).then(function () {
                setTimeout(function () {
                    counter.should.be.exactly(2);
                    done();
                }, 2500);
            }).catch(done);
        });
    });
});

