define(["app", "backbone", "dashboard/dashboard.view"],
    function (app, Backbone, DashboardView) {
        if (app.settings.playgroundMode)
            return;

        app.module("dashboard", function (module) {
            var Router = Backbone.Router.extend({
                routes: {
                    "": "dashboard",
                },
                dashboard: function () {
                    app.layout.content.show(new DashboardView());
                },
            });

            app.dashboard.router = new Router();
        });
    });