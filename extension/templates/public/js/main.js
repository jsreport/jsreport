define(["jquery", "app", "marionette", "backbone",
        "./template.list.model", "./template.list.view","./template.list.toolbar.view",
        "./template.model", "./template.detail.view",
        "./dashboard.templates.model", "./dashboard.templates.view",
        "./template.detail.toolbar.view"],
    function($, app, Marionette, Backbone, TemplateListModel, TemplateListView, TemplateListTooolbarView, TemplateModel,
        TemplateDetailView, DashboardModel, DashboardView, ToolbarView) {
        return app.module("template", function(module) {
            module.TemplateListView = TemplateListView;
            module.TemplateListModel = TemplateListModel;
            module.TemplateListTooolbarView = TemplateListTooolbarView;
            
            var Router = Backbone.Router.extend({                
                initialize: function() {
                    var self = this;
                    app.listenTo(app, "template-saved", function(templateModel) {
                        if (app.settings.playgroundMode) {
                            self.navigatingForFirstSave = true;
                        }

                        window.location.hash = "/playground/" + templateModel.get("shortid") +
                            (app.settings.playgroundMode ? ("/" + templateModel.get("version")) : "");
                    });
                },

                routes: {
                    "extension/templates": "templates",
                    "extension/templates/:id(/)(:version)": "templateDetail",
                    "playground": "playground",
                    "playground/:id(/:version)": "playground",
                },

                templates: function() {
                    this.navigate("/extension/templates");
                    var model = new TemplateListModel();
                    
                    app.layout.showToolbarViewComposition(new TemplateListView({ collection: model }), new TemplateListTooolbarView({ collection: model }));
                    
                    model.fetch();
                },
                

                showTemplateView: function(id, version) {
                    var model = new TemplateModel({ version: version });

                    function show() {
                        app.layout.showToolbarViewComposition(new TemplateDetailView({ model: model }), new ToolbarView({ model: model }));
                    };
                    
                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch({
                            success: function() {
                                show();
                            }
                        });
                    } else {
                        show();
                    }
                },

                templateDetail: function(id, version) {
                    this.showTemplateView(id, version);
                },

                playground: function(id, version) {
                    if (this.navigatingForFirstSave) {
                        this.navigatingForFirstSave = false;
                        return;
                    }

                    this.showTemplateView(id, version);
                },
            });

            module.on("created", function() {
                module.router.templates();
            });

            module.router = new Router();

            if (!app.settings.playgroundMode) {

                app.on("menu-render", function(context) {
                    context.result += "<li><a href='#/extension/templates'>Templates</a></li>";
                });

                app.on("menu-actions-render", function(context) {
                    context.result += "<li><a href='#/playground'>Create Template</a></li>";
                });

                app.on("dashboard-extensions-render", function(region) {
                    var model = new DashboardModel();
                    region.show(new DashboardView({
                        collection: model
                    }));
                    model.fetch();
                });
            }


            app.on("entity-registration", function(context) {

                var templateAttributes = {
                    '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
                    'name': { 'type': 'Edm.String' },
                    'modificationDate': { 'type': 'Edm.DateTime' },
                    'engine': { 'type': 'Edm.String' },
                    'recipe': { 'type': 'Edm.String' },
                    'content': { 'type': 'Edm.String' },
                    'shortid': { 'type': 'Edm.String' },
                    'helpers': { 'type': 'Edm.String' },
                    'generatedReportsCounter': { 'type': 'Edm.Int32' },
                };

                if (app.settings.playgroundMode) {
                    templateAttributes.version = { 'type': 'Edm.Int32' };
                }

                $data.Entity.extend('$entity.Template', templateAttributes);
                $entity.Template.prototype.toString = function() {
                    return "Template " + (this.name || "");
                };

                context["templates"] = { type: $data.EntitySet, elementType: $entity.Template };
            });

        });
    });