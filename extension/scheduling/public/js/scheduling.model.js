define(["app", "core/basicModel", "underscore", "./scheduling.tasks.model"], function (app, ModelBase, _, TasksModel) {

    return ModelBase.extend({

        fetch: function (options) {
            var self = this;

            this.tasks.scheduleShortid = self.get("shortid");

            function fetchSchedule(options) {
                app.dataProvider.get("odata/templates").then(function (templates) {
                    self.templates = templates.map(function (t) {
                        return {shortid: t.shortid, name: t.name};
                    })
                    self.templates.unshift({name: "-- select template --"});
                    if (self.get("shortid")) {
                        return app.dataProvider.get("odata/schedules?$filter=shortid eq " + self.get("shortid")).then(function (schedules) {
                            var schedule = schedules[0];
                            self.set(schedule);
                            self.set("templateName", _.findWhere(templates, {shortid: schedule.templateShortid}).name);
                            options.success();
                        });
                    } else {
                        self.set("templateName", "-- select template --");
                        options.success();
                    }
                });
            }

            fetchSchedule({
                success: function () {
                    self.trigger("sync");
                    if (self.tasks.scheduleShortid) {
                        self.tasks.fetch(options);
                    } else {
                        options.success();
                    }
                }
            });
        },

        odata: "schedules",

        defaults: {
            enabled: true
        },

        initialize: function () {
            this.tasks = new TasksModel();
        },

        toString: function () {
            return "Schedule " + (this.get("name") || "");
        }
    });
});