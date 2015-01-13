/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "app", "marionette", "backbone", "core/view.base", "underscore"],
    function ($, app, Marionette, Backbone, ViewBase, _) {
        return app.module("public-templates", function (module) {
            app.on("entity-registration", function(context) {
                $entity.Template.addMember("readSharingToken", { type: "string" });
                $entity.Template.addMember("writeSharingToken", { type: "string" });
            });
        });
    });