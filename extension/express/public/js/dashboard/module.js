/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

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
                    
                    function show() {
                        app.layout.content.show(new DashboardView());
                    };

                    if (app.settings.firstRun) {
                        app.dataContext.templates.take(1).toArray().then(function(templates) {
                            if (templates.length == 0)
                                window.location.hash = "/playground";
                            else
                                show();
                        });
                    } else
                        show();
                },
            });

            app.dashboard.router = new Router();
        });
    });