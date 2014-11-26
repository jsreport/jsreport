/*!
 * Copyright(c) 2014 Jan Blaha
 */

/* globals jsreport_server_url */

define(["jquery", "backbone", "marionette", "async", "core/utils", "core/listenerCollection", "toastr", "deferred", "jsrender.bootstrap"], function ($, Backbone, Marionette, async, Utils, ListenerCollection) {
    var app = new Marionette.Application();
    app.serverUrl = jsreport_server_url;
    app.options = {
        mode: jsreport_mode,
        studio: jsreport_studio
    };

    app.onStartListeners = new ListenerCollection();
    app.hideSaveButton = true;

    $.ajaxSetup({
        cache: false,
        converters: {
            "text json": function (loadedData) {
                return $.parseJSON(loadedData, true);
            }
        },
        contentType: "application/json",
        beforeSend: function( xhr, settings ) {
            xhr.setRequestHeader('host-cookie', document.cookie);
            settings.url += "&mode=embedded";
        }
    });


    app.reloadSettings = function (cb) {
        $.getJSON(app.serverUrl + "api/settings", function (settings) {
            app.settings = settings;
            cb(null, settings);
        });
    };

    app.addInitializer(function () {
        async.parallel([
            function (cb) {

                function compileTemplates(templates) {
                    for (var i = 0; i < templates.length; i++) {
                        $.templates(templates[i].name, templates[i].content);
                    }
                }

                var templateBust = "";

                if (templateBust !== "" && localStorage.getItem("templates-" + templateBust) != null) {
                    compileTemplates(JSON.parse(localStorage.getItem("templates-" + templateBust)));
                    return cb(null, null);
                }

                $.getJSON(app.serverUrl + "html-templates", function (templates) {
                    localStorage.setItem("templates-" + templateBust, JSON.stringify(templates));
                    compileTemplates(templates);
                    cb(null, null);
                });
            },
            function (cb) {
                $.getJSON(app.serverUrl + "api/recipe", function (recipes) {
                    app.recipes = recipes;
                    cb(null, null);
                });
            },
            function (cb) {
                $.getJSON(app.serverUrl + "api/engine", function (engines) {
                    app.engines = engines;
                    cb(null, null);
                });
            },
            function (cb) {
                app.reloadSettings(cb);
            }
        ], function () {
            require(["core/menu.view", "layout", "core/extensions/module", "core/backbone.sync", "core/dataContext",
                    "core/basicModel", "core/settingsCollection", "core/introduction"],
                function (MenuView, Layout, extensions, sync, odata, BasicModel) {
                    app.extensions.init(function () {
                        app.layout = new Layout();
                        app.layout.template = "embed-layout";
                        odata(app, function (cx) {
                            app.dataContext = cx;

                            app.dataContext.prepareRequest = function (r) {
                                if (r[0].requestUri.indexOf("?") === -1)
                                    r[0].requestUri += "?";
                                else
                                    r[0].requestUri += "&";

                                r[0].requestUri += "mode=embedded";
                            };

                            app.onStartListeners.fire(function () {
                                app.layout.render();
                                Backbone.history.start();
                                app.trigger("after-start");
                                app.trigger("open-template", { template: {}});

                                if (window.parent && window.parent.jsreport)
                                    window.parent.jsreport.onLoaded(app);
                            });
                        });
                    });
                });
        });
    });

    return app;
});