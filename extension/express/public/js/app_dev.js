/*! 
 * Copyright(c) 2014 Jan Blaha
 */

define(["jquery", "backbone", "marionette", "async", "core/utils", "core/listenerCollection", "toastr", "deferred", "jsrender.bootstrap"],
    function($, Backbone, Marionette, async, Utils, ListenerCollection) {
      
    var app = new Marionette.Application();
    app.serverUrl = jsreport_server_url || "/";
    app.onStartListeners = new ListenerCollection();
    app.options = {
        mode: jsreport_mode,
        studio: jsreport_studio,
        headers: {},
        showIntro: true
    };
    app.recipes = {};

    $.ajaxSetup({
        cache: false,
        converters: {
            "text json": function(loadedData) {
                return $.parseJSON(loadedData, true);
            }
        },
        contentType: "application/json",
        beforeSend: function( xhr, settings ) {
            for (var key in app.options.headers) {
                xhr.setRequestHeader(key, app.options.headers[key]);
            }
            settings.url += "&studio=" + app.options.studio;
        },
        error: function(xhr, status, err) {
            console.log(status);
            console.log(err);
        }
    });

    app.reloadSettings = function(cb) {
        $.getJSON(app.serverUrl + "api/settings", function(settings) {
            app.settings = settings;
            cb(null, settings);
        });
    };

    app.addInitializer(function() {
        async.parallel([
            function(cb) {

                function compileTemplates(templates) {
                    for (var i = 0; i < templates.length; i++) {
                        $.templates(templates[i].name, templates[i].content);
                    }
                }


                if (jsreport_bust && localStorage.getItem("templates-" + jsreport_bust) != null) {
                    compileTemplates(JSON.parse(localStorage.getItem("templates-" + jsreport_bust)));
                    return cb(null, null);
                }

                $.getJSON(app.serverUrl + "html-templates", function(templates) {                 
                    localStorage.setItem("templates-" + jsreport_bust, JSON.stringify(templates));
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
                        function startApp() {
                            app.layout = new Layout();
                           
                            odata(app, function(cx) {
                                app.dataContext = cx;
                                app.onStartListeners.fire(function() {
                                    app.layout.render();
                                    app.layout.hideLoader();

                                    if (app.options.studio !== "embed") {
                                        app.layout.menu.show(new MenuView({model: new BasicModel(app.settings)}));
                                    }
                                    Backbone.history.start();
                                    app.trigger("after-start");

                                    if (app.options.studio === "embed") {
                                        app.trigger("open-template", { template: {}});

                                        if (window.parent && window.parent.jsreport)
                                            window.parent.jsreport._onLoaded(app);
                                    }
                                });
                            });
                        }

                        if (app.options.studio !== "embed") {
                            require(["dashboard/module"], startApp);
                        }
                        else {
                            startApp();
                        }
                    });

                });
        });
    });

    return app;
});