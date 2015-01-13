/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "app", "marionette", "backbone",
        "./template.list.model", "./template.list.view", "./template.list.toolbar.view",
        "./template.model", "./template.detail.view",
        "./dashboard.templates.model", "./dashboard.templates.view",
        "./template.detail.toolbar.view", "./template.entityRegistration", "./template.preview"],
    function ($, app, Marionette, Backbone, TemplateListModel, TemplateListView, TemplateListTooolbarView, TemplateModel, TemplateDetailView, DashboardModel, DashboardView, ToolbarView, entityRegistration, preview) {
        return app.module("template", function (module) {
            module.TemplateListView = TemplateListView;
            module.TemplateListModel = TemplateListModel;
            module.TemplateListTooolbarView = TemplateListTooolbarView;
            module.TemplateDetailTooolbarView = ToolbarView;
            module.preview = preview;


            this.listenTo(app, "after-start", function() {
                //jump to template designer on the first start
                if (!app.settings.firstRun)
                    return;

                app.dataContext.templates.take(1).toArray().then(function(templates) {
                    if (templates.length === 0)
                        window.location.hash = "/playground";
                    else
                        window.location.hash = "#/extension/templates/" + templates[0].shortid;
                });
            });

            var Router = Backbone.Router.extend({
                initialize: function () {
                    var self = this;
                    app.listenTo(app, "template-saved", function (templateModel) {
                        self.navigate("/playground/" + templateModel.get("shortid"));
                    });
                },

                routes: {
                    "extension/templates": "templates",
                    "extension/templates/:id(/)(:version)": "templateDetail",
                    "playground": "playground",
                    "playground/:id(/:version)": "playground"
                },

                templates: function () {
                    this.navigate("/extension/templates");
                    var model = new TemplateListModel();

                    app.layout.showToolbarViewComposition(new TemplateListView({ collection: model }), new TemplateListTooolbarView({ collection: model }));

                    model.fetch();
                },

                showTemplateView: function (id, version) {
                    var model = new TemplateModel({ version: version });

                    function show() {
                        app.layout.showToolbarViewComposition(new TemplateDetailView({ model: model }), new ToolbarView({ model: model }));
                    }

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch({
                            success: function () {
                                show();
                            }
                        });
                    } else {
                        show();
                    }
                },

                templateDetail: function (id, version) {
                    this.showTemplateView(id, version);
                },

                playground: function (id, version) {
                    if (this.navigatingForFirstSave) {
                        this.navigatingForFirstSave = false;
                        return;
                    }

                    this.showTemplateView(id, version);
                }
            });

            module.on("created", function () {
                module.router.templates();
            });

            module.router = new Router();


            app.on("menu-render", function (context) {
                context.result += "<li><a href='#/extension/templates'>Templates</a></li>";
            });

            app.on("menu-actions-render", function (context) {
                context.result += "<li><a id='createTemplateCommand' href='#/playground'>Create Template</a></li>";
            });

            app.on("dashboard-extensions-render", function (region) {
                var model = new DashboardModel();
                region.show(new DashboardView({
                    collection: model
                }), "templates");
                model.fetch();
            });

            app.on("entity-registration", entityRegistration);
        });
    });