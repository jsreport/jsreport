﻿define(["app", "marionette", "backbone",
        "./data.list.model", "./data.list.view", "./data.list.toolbar.view",
        "./data.model", "./data.detail.view",
        "./data.template.view",
        "./data.toolbar.view", "./data.template.model"],
    function (app, Marionette, Backbone, DataListModel, DataListView, DataListToolbarView, DataModel, DataDetailView,
              TemplateStandardView, ToolbarView, TemplateStandardModel) {

        app.options.data = app.options.data || { allowSelection: true, allowCustom: false};

        app.module("data", function (module) {
            var Router = Backbone.Router.extend({
                initialize: function () {
                    app.listenTo(app, "data-saved", function (model) {
                        window.location.hash = "/extension/data/detail/" + model.get("shortid");
                    });
                },

                routes: {
                    "extension/data/list": "data",
                    "extension/data/detail/:id": "dataDetail",
                    "extension/data/detail": "dataDetail"
                },

                data: function () {
                    this.navigate("/extension/data/list");

                    var model = new DataListModel();
                    app.layout.showToolbarViewComposition(new DataListView({ collection: model }), new DataListToolbarView({ collection: model }));
                    model.fetch();
                },

                dataDetail: function (id) {
                    var model = new DataModel();
                    app.layout.showToolbarViewComposition(new DataDetailView({ model: model }), new ToolbarView({ model: model }));

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch();
                    }
                }
            });

            app.data.on("created", function () {
                app.data.router.data();
            });

            app.data.router = new Router();


            app.on("menu-render", function (context) {
                context.result += "<li><a href='/#/extension/data/list'>Data</a></li>";
            });

            app.on("menu-actions-render", function (context) {
                context.result += "<li><a id='createDataCommand' href='#/extension/data/detail' class='validate-leaving'>Create Data</a></li>";
            });


            app.on("template-extensions-render", function (context) {

                var model = new TemplateStandardModel();
                model.setTemplate(context.template);

                model.fetch().then(function () {
                    var view = new TemplateStandardView({ model: model});
                    context.extensionsRegion.show(view, "data");
                });
            });
        });
    });