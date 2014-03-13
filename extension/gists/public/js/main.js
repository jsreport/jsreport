define(["jquery", "app", "marionette", "backbone", "./gists.template.view"],
    function($, app, Marionette, Backbone, GistsView) {

        var view;
        app.on("template-extensions-render", function(context) {
        

            view = new GistsView({ model: context.template });

            
            context.extensionsRegion.show(view, "gists");

        });
        
        app.template.TemplateDetailTooolbarView.prototype.save = function() {
                view.save.call(view);
            };
        
        app.on("entity-registration", function(context) {
            $entity.Template.addMember("gistId", { 'type': "Edm.String" });
        });
    });