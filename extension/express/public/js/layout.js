﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "marionette", "jquery", "toastr"], function(app, Marionette, $, toastr) {

    return Marionette.Layout.extend({
        template: app.options.studio !== "embed" ? "layout" : "embed-layout",
        el: "#jsreport-root",

        initialize: function() {
            var self = this;

            app.on("read:started create:started update:started delete:started", function() {
                self.showLoader();
            });

            app.on("read:success create:success update:success delete:success", function() {
                self.hideLoader();
            });

            app.on("update:success", function(model) {
                if (model.toString())
                    toastr.info(model.toString() + " was updated.");
            });

            app.on("delete:success", function(model) {
                if (model.toString())
                    toastr.info(model.toString() + " was deleted.");
            });

            app.on("create:success", function(model) {
                if (model.toString())
                    toastr.info(model.toString() + " was created.");
            });

            app.on("read:error create:error update:error delete:error error", function(e) {
                self.hideLoader();

                if (e.handled)
                    return;

                if (e.responseJSON) {
                    e.responseJSON = e.responseJSON.error || e.responseJSON;
                    $.dialog({
                        header: e.responseJSON.message,
                        content: "<b>" + e.responseJSON.message + "</b><br><small>" + e.responseJSON.stack + "</small>",
                        hideSubmit: true,
                        error: true
                    });

                    return;
                }

                var responseText = (e.responseText || e.message);
                if (responseText.length > 800)
                    responseText = responseText.substring(0, 800) + "...";


                $.dialog({
                    header: e.statusText || "Error",
                    content: $('<div/>').text(responseText).html(),
                    hideSubmit: true,
                    error: true
                });
            });

            app.on("validation", function(message) {
                self.hideLoader();

                $.dialog({
                    header: "Validations",
                    content: $('<div/>').html(message).html(),
                    hideSubmit: true,
                    error: true
                });
            });

            app.on("toastr:info", function(message) {
                toastr.info(message);
            });

            this.dialog.show = function(view) {
                self.trigger("dialog-opening");
                Marionette.Region.prototype.show.call(this, view);
                self.dialog.$el.modal();
                self.dialog.$el.on("hidden.bs.modal", function() {
                    self.trigger("dialog-closing");
                });
            };

            this.dialog.hide = function() {
                self.dialog.$el.modal('hide');
            };


            this.content.show = function(view) {
                Marionette.Region.prototype.show.call(this, view);
                self.toolbar.close();
            };
        },

        showLoader: function() {
            $(".loader").show();
        },

        hideLoader: function() {
            $(".loader").hide();
        },

        showToolbarViewComposition: function(contentView, toolbarView) {

            this.listenTo(toolbarView, "render", function() {
                app.trigger("view-render", toolbarView);
            });

            this.content.show(contentView);
            toolbarView.contentView = contentView;
            this.toolbar.show(toolbarView);
            this.lastView = contentView;
        },

        regions: {
            menu: "#menu",
            dialog: "#customModal",
            content: "#content",
            toolbar: "#toolbar"
        }
    });
});