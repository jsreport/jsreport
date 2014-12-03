define(["jquery", "app", "marionette", "backbone", "core/view.base", "underscore",  "core/basicModel"],
    function($, app, Marionette, Backbone, ViewBase, _, ModelBase) {

        var View = ViewBase.extend({
            template: "embed-text-template",

            initialize: function() {
            }
        });

        app.on("extensions-menu-render", function(context) {
            context.result += "<li><a id='textMenuCommand' title='define text file options' style='display:none'><i class='fa fa-file-code-o'></i></a></li>";
            context.on("after-render", function ($el) {
                if (context.template.get("recipe") === "text") {
                    $("#textMenuCommand").show();
                }
                else {
                    $("#textMenuCommand").hide();
                }

                $("#textMenuCommand").click(function () {
                    var view = new View({ model: context.template});
                    context.region.show(view, "text");
                });
            });

            context.template.on("change:recipe", function () {
                if (context.template.get("recipe") === "text") {
                    $("#textMenuCommand").show();
                }
                else {
                    $("#textMenuCommand").hide();
                }
            });
        });

        app.on("entity-registration", function(context) {
            $entity.Template.addMember("contentType", { 'type': "string" });
            $entity.Template.addMember("fileExtension", { 'type': "string" });
            $entity.Template.addMember("contentDisposition", { 'type': "string" });
        });
});