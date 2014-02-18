define(["jquery", "app", "marionette", "backbone", "./childTemplates.template.model", "./childTemplates.template.view"],
    function($, app, Marionette, Backbone, Model, View) {

        var Router = Backbone.Router.extend({
            initialize: function() {
            },

            routes: {
                "extension/childTemplates": "childTemplates"
            },

            childTemplates: function() {
                this.navigate("/extension/childTemplates");
                var model = new app.template.TemplateListModel();

                model.fetchQuery = function() {
                    return app.dataContext.templates.filter(function(t) {
                        return t.isChildTemplate == true;
                    }).orderByDescending(function(t) {
                        return t.modificationDate;
                    }).applyFilter(model.filter).toArray();
                },
                app.layout.showToolbarViewComposition(new app.template.TemplateListView({ collection: model }),
                    new app.template.TemplateListTooolbarView({ collection: model }));

                model.fetch();
            },
        });

        new Router();

        app.on("menu-render", function(context) {
            context.result += "<li><a href='#/extension/childTemplates'>Child Templates</a></li>";
        });

        app.on("entity-registration", function(context) {
            $entity.Template.addMember("isChildTemplate", { 'type': "Edm.Boolean" });
        });

        app.on("template-extensions-render", function(context) {
            var model = new Model();
            model.setTemplate(context.template);
            var view = new View({ model: model });
            context.extensionsRegion.show(view);     
        });

        //alert(templates);
        //var view = new View();
        //alert("template " + view.template);
    });