define(["app", "marionette", "backbone",
        "./scripts.list.model", "./scripts.list.view", "./scripts.list.toolbar.view",
        "./scripts.model", "./scripts.template.standard.view",
        "./scripts.template.standard.model", "./scripts.detail.view", "./scripts.toolbar.view",
        "./scripts.entityRegistration"],
    function (app, Marionette, Backbone, ScriptsListModel, ScriptsListView, ScriptsListToolbarView,
              ScriptsModel, StandardTemplateView, StandardTemplateModel, ScriptsDetailView, ToolbarView,
              entityRegistration) {

        app.options.scripts = app.options.scripts || { allowSelection: true , allowCustom: false};

        app.module("scripts", function (module) {

            var Router = Backbone.Router.extend({
                initialize: function () {
                    app.listenTo(app, "script-saved", function (model) {
                        window.location.hash = "/extension/scripts/detail/" + model.get("shortid");
                    });
                },

                routes: {
                    "extension/scripts/list": "scripts",
                    "extension/scripts/detail/:id": "scriptsDetail",
                    "extension/scripts/detail": "scriptsDetail"
                },

                scripts: function () {
                    this.navigate("/extension/scripts/list");

                    var model = new ScriptsListModel();

                    app.layout.showToolbarViewComposition(new ScriptsListView({ collection: model }), new ScriptsListToolbarView({ collection: model }));


                    model.fetch();
                },

                scriptsDetail: function (id) {
                    var model = new ScriptsModel();

                    app.layout.showToolbarViewComposition(new ScriptsDetailView({ model: model }), new ToolbarView({ model: model }));

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch();
                    }
                }
            });

            app.scripts.router = new Router();

            app.on("menu-render", function (context) {
                context.result += "<li><a href='/#/extension/scripts/list'>Scripts</a></li>";
            });

            app.on("menu-actions-render", function (context) {
                context.result += "<li><a href='/#/extension/scripts/detail'>Create Script</a></li>";
            });

            app.on("template-extensions-render", function (context) {
                var model = new StandardTemplateModel();
                model.setTemplate(context.template);

                model.fetch({
                    success: function () {
                        var view = new StandardTemplateView({ model: model });
                        context.extensionsRegion.show(view, "scripts");
                    }
                });
            });

            app.on("entity-registration", entityRegistration);
        });
    });