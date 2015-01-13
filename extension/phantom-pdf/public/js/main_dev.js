define(["jquery", "app", "marionette", "backbone", "./phantom.template.view", "./phantom.template.model"],
    function($, app, Marionette, Backbone, TemplateView, Model) {

        app.on("template-extensions-render", function(context) {
            var view;

            function renderRecipeMenu() {
                if (context.template.get("recipe") === "phantom-pdf") {
                    var model = new Model();
                    model.setTemplate(context.template);
                    view = new TemplateView({ model: model});
                    
                    context.extensionsRegion.show(view, "phantom");
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

        app.on("entity-registration", function(context) {
            $data.Class.define("$entity.Phantom", $data.Entity, null, {
                'margin': { 'type': 'Edm.String' },
                'header': { 'type': 'Edm.String' },
                'footer': { 'type': 'Edm.String' },
                'headerHeight': { 'type': 'Edm.String' },
                'footerHeight': { 'type': 'Edm.String' },
                'orientation': { 'type': 'Edm.String' },
                'format': { 'type': "string" },
                'width': { 'type': "string" },
                'height': { 'type': "string" },
                'printDelay': { 'type': "int" }
            }, null);
            
            $entity.Template.addMember("phantom", { 'type': "$entity.Phantom" });
        });
    });