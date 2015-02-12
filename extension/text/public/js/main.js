define(["jquery", "app", "marionette", "backbone", "core/view.base", "underscore"],
        function($, app, Marionette, Backbone, ViewBase, _) {
        var View = ViewBase.extend({
            tagName: "li",
            template: "text-template",

            initialize: function() {
                _.bindAll(this, "isFilled");
            },

            isFilled: function() {
                return this.model.get("contentType") || this.model.get("fileExtension") || this.model.get("contentDisposition");
            }
        });

        app.on("template-extensions-render", function(context) {
            var view;
            function renderRecipeMenu() {
                if (context.template.get("recipe") === "text") {
                    view = new View({ model: context.template});
                    context.extensionsRegion.show(view, "text");
                } else {
                    if (view != null)
                        $(view.el).remove();
                }
            }

            renderRecipeMenu();

            context.template.on("change:recipe", function() {
                renderRecipeMenu();
            });
        });
    });