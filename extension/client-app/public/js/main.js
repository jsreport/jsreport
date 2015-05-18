/*!
 * Copyright(c) 2014 Jan Blaha
 */

define(["jquery", "app", "marionette", "backbone", "core/view.base", "underscore"],
    function ($, app, Marionette, Backbone, ViewBase, _) {

        if (!app.authentication)
            return;

        return app.module("public-templates", function (module) {

            var TemplateToolbarView = ViewBase.extend({
                tagName: "li",
                template: "template-set-default",

                initialize: function() {
                    _.bindAll(this, "setDefault");
                    this.model.set("isClientDefault", this.model.get("isClientDefault") === true, { silent: true});
                },

                events: {
                    "click #setDefaultCommand": "setDefault"
                },

                setDefault: function() {
                    this.model.set("isClientDefault", !this.model.get("isClientDefault"));
                    this.model.save();
                    this.render();
                }
            });

            var UserToolbarView = ViewBase.extend({
                tagName: "li",
                template: "user-set-preference",

                initialize: function() {
                    _.bindAll(this, "setPreference");
                    this.model.set("isClientAppPreferred", this.model.get("isClientAppPreferred") === true, { silent: true});
                },

                events: {
                    "click #setPreferenceCommand": "setPreference"
                },

                setPreference: function() {
                    this.model.set("isClientAppPreferred", !this.model.get("isClientAppPreferred"));
                    this.model.save();
                    this.render();
                }
            });

            app.on("toolbar-render", function (context) {
                if (context.name === "user-detail") {
                    var view = new UserToolbarView({model: context.model});
                    context.region.show(view, "setPreference");
                }
            });

            app.on("toolbar-render", function (context) {
                if (context.name === "template-detail") {
                    var view = new TemplateToolbarView({model: context.model});
                    context.region.show(view, "setDefault");
                }
            });
        });
    });