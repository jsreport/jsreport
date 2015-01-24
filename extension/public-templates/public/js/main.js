/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "app", "marionette", "backbone", "core/view.base", "underscore"],
    function ($, app, Marionette, Backbone, ViewBase, _) {

        if (!app.authentication)
            return;

        return app.module("public-templates", function (module) {

            var TemplateShareDialog = ViewBase.extend({
                template: "template-share-dialog",

                initialize: function() {
                    var self = this;

                    this.listenTo(this.model, "change", function() {
                        self.render();
                    });

                    _.bindAll(this, "readLink", "writeLink");
                },

                events: {
                    "click #readLinkCommand": "readLink",
                    "click #writeLinkCommand": "writeLink"
                },

                readLink: function() {
                    var self = this;
                    $.getJSON(app.serverUrl + "api/templates/sharing/" + this.model.get("shortid") + "/grant/read", function(data) {
                        self.model.set("readSharingToken", data.token);
                    });
                },

                writeLink: function() {
                    var self = this;
                    $.getJSON(app.serverUrl + "api/templates/sharing/" + this.model.get("shortid") + "/grant/write", function(data) {
                        self.model.set("writeSharingToken", data.token);
                    });
                }
            });

            var TemplateToolbarView = ViewBase.extend({
                tagName: "li",
                template: "template-share",

                initialize: function() {
                    _.bindAll(this, "share");
                },

                events: {
                    "click #shareCommand": "share"
                },

                share: function() {
                    var dialog = new TemplateShareDialog({ model: this.model });
                    app.layout.dialog.show(dialog);
                }
            });

            app.on("toolbar-render", function (context) {
                if (context.name === "template-detail") {
                    var view = new TemplateToolbarView({model: context.model});
                    context.region.show(view, "share");
                }
            });

            app.on("entity-registration", function(context) {
                $entity.Template.addMember("readSharingToken", { type: "string" });
                $entity.Template.addMember("writeSharingToken", { type: "string" });
            });
        });
    });