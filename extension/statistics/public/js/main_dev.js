/* globals $entity */

define(["app", "marionette", "backbone",
        "./dashboard.statistics.model", "./dashboard.statistics.view"],
    function (app, Marionette, Backbone, DashboardModel, DashboardView) {
            app.on("dashboard-extensions-render", function (region) {
                var model = new DashboardModel();
                region.show(new DashboardView({
                    model: model
                }), "stats");
                model.fetch();
            });
    });