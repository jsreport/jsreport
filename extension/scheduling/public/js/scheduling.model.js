define(["app", "core/jaydataModel", "underscore", "./scheduling.tasks.model"], function (app, ModelBase, _, TasksModel) {

    return ModelBase.extend({
        contextSet: function () {
            return app.dataContext.schedules;
        },

        fetch: function (options) {
            var self = this;

            this.tasks.scheduleShortid = self.get("shortid");

            function fetchSchedule(options) {
                    app.dataContext.templates.map(function(t) { return { shortid: t.shortid, name: t.name }; }).toArray().then(function (templates) {
                        self.templates = templates;
                        self.templates.unshift({ name: "-- select template --"});
                        if (self.get("shortid")) {
                            return app.dataContext.schedules.single(function (r) {
                                return r.shortid === this.id;
                            }, {id: self.get("shortid")}).then(function (schedule) {
                                self.set(schedule.initData);
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
                success: function() {
                    self.trigger("sync");
                    if (self.tasks.scheduleShortid) {
                        self.tasks.fetch(options);
                    } else {
                        options.success();
                    }
                }
            });
        },

        defaults: {
            enabled: true
        },

        _initialize: function () {
            var self = this;
            this.Entity = $entity.Schedule;
            this.tasks = new TasksModel();
        },

        toString: function() {
            return "Schedule " + (this.get("name") || "");
        }
    });
});