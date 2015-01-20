/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

requirejs.config({
    baseUrl: jsreport_server_url + "js",
    waitSeconds: 60,
    paths: {
        app: jsreport_main_app,
        underscore: "../lib/underscore",
        backbone: "../lib/backbone",
        originalmarionette: "../lib/backbone.marionette",
        marionette: "core/marionette.bootstrap",
        modelBinder: "../lib/backbone.modelBinder",
        
        originaljquery: "../lib/jquery",
        jquery: "core/jquery.bootstrap",
        jsrender: "../lib/jsrender",
        bootstrap: "../lib/bootstrap",
        "jquery.flot": "../lib/jquery.flot",
        "jquery.flot.time": "../lib/jquery.flot.time",
        "jquery.flot.axislabels": "../lib/jquery.flot.axislabels",
        "jquery.flot.symbol": "../lib/jquery.flot.symbol",
        dialog: "core/dialog",
        errorAlert: "core/errorAlert",
        "jsrender.bootstrap": "core/jsrender.bootstrap",
        
        toastr: "../lib/toastr",
        "jquery.ui.core": "../lib/jquery.ui.core",
        "jquery.ui.widget": "../lib/jquery.ui.widget",
        "jquery.ui.mouse": "../lib/jquery.ui.mouse",
        "jquery.ui.selectable": "../lib/jquery.ui.selectable",
        "jquery.fineuploader": "../lib/jquery.fineuploader-3.0",
        "bootstrap.multiselect": "../lib/bootstrap-multiselect",
        "split-pane": "../lib/split-pane",
        "introJs": "../lib/intro",
        json2: "../lib/json2",
        async: "../lib/async",
        deferred: "../lib/deferred",
        text: "../lib/text",
        ace: "../lib/ace"
    },

    shim: {
        underscore: {
            exports: "_"
        },
        backbone: {
            deps: ["originaljquery", "underscore", "json2"],
            exports: "Backbone"
        },
        modelBinder: {
            deps: ["originaljquery", "underscore", "json2"],
            exports: "Backbone.ModelBinder"
        },
        originalmarionette: {
            deps: ["backbone"],
            exports: "Marionette"
        },
        marionette: {
            deps: ["originalmarionette", "modelBinder"],
            exports: "Marionette"
        },
        jsrender: {
            deps: ["originaljquery"],
            exports: "$"
        },
        
        "jsrender.bootstrap": {
            deps: ["originaljquery", "jsrender"],
            exports: "$"
        },
        
        bootstrap: {
            deps: ["originaljquery"],
            exports: "$"
        },
        "jquery.flot": ["originaljquery"],
        "jquery.flot.axislabels": ["jquery.flot"],
        "jquery.flot.symbol": ["jquery.flot.axislabels"],
        "jquery.flot.time": ["originaljquery",  "jquery.flot.axislabels"],

        dialog: ["originaljquery", "bootstrap"],
        errorAlert: ["originaljquery", "jsrender", "bootstrap"],
        "jquery.ui.core": ["originaljquery"],
        "jquery.ui.widget": ["jquery.ui.core"],
        "jquery.ui.mouse": ["jquery.ui.widget"],
        "jquery.ui.selectable": ["jquery.ui.mouse"],
        "jquery.ui.resizable": ["jquery.ui.mouse"],
        "jquery.fineuploader": ["originaljquery"],
        "bootstrap.multiselect": ["originaljquery"],
        "split-pane": ["originaljquery"],

        "jquery": {
            deps: ["originaljquery", "jsrender.bootstrap", "bootstrap", "jquery.flot",
                "jquery.flot.time", "dialog", "jquery.ui.selectable", 
                "errorAlert", "toastr", "split-pane", "jquery.fineuploader", "bootstrap.multiselect"],
            exports: "$"
        }
    }
});

require(["app"], function (app) {
    app.start();
});

define( "jQuery", ["$"], function ($) { return jQuery; } );