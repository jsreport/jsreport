/*! 
 * Copyright(c) 2014 Jan Blaha
 */

define(["jquery", "marionette", "async", "core/utils", "core/listenerCollection", "toastr", "deferred", "jsrender.bootstrap"], function($, Marionette, async, Utils, ListenerCollection) {
    var app = new Backbone.Marionette.Application();
    app.serverUrl = jsreport_server_url || "/";
    app.onStartListeners = new ListenerCollection();

    $.ajaxSetup({
        cache: false,
        converters: {
            "text json": function(loadedData) {
                return $.parseJSON(loadedData, true);
            }
        },
        contentType: "application/json"
    });

    app.reloadSettings = function(cb) {
        $.getJSON(app.serverUrl + "api/settings", function(settings) {
            app.settings = settings;
            cb(null, settings);
        });
    }

    app.addInitializer(function() {
        async.parallel([
            function(cb) {

                function compileTemplates(templates) {
                    for (var i = 0; i < templates.length; i++) {
                        $.templates(templates[i].name, templates[i].content);
                    }
                }

                var templateBust = "";

                if (templateBust != "" && localStorage.getItem("templates-" + templateBust) != null) {
                    compileTemplates(JSON.parse(localStorage.getItem("templates-" + templateBust)));
                    return cb(null, null);
                }

                $.getJSON(app.serverUrl + "html-templates", function(templates) {
                    localStorage.setItem("templates-" + templateBust, JSON.stringify(templates));
                    compileTemplates(templates);
                    cb(null, null);
                });
            },
            function(cb) {
                $.getJSON(app.serverUrl + "api/recipe", function(recipes) {
                    app.recipes = recipes;
                    cb(null, null);
                });
            },
            function(cb) {
                $.getJSON(app.serverUrl + "api/engine", function(engines) {
                    app.engines = engines;
                    cb(null, null);
                });
            },
            function(cb) {
                app.reloadSettings(cb);
            }
        ], function() {
            require(["core/menu.view", "layout", "core/extensions/module", "core/backbone.sync", "core/dataContext",
                    "core/basicModel", "core/settingsCollection", "core/introduction"],
                function(MenuView, Layout, extensions, sync, odata, BasicModel) {
                    app.extensions.init(function() {
                        require(["dashboard/module"], function() {
                            app.layout = new Layout();

                            odata(app, function(cx) {
                                app.dataContext = cx;
                                app.onStartListeners.fire(function() {
                                    app.layout.render();
                                    app.layout.menu.show(new MenuView({ model: new BasicModel(app.settings) }));
                                    Backbone.history.start();
                                    app.trigger("after-start");
                                });
                            });
                        });
                    });

                });
        });
    });

    return app;
});