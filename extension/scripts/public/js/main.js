define(["app", "marionette", "backbone",
        "./scripts.list.model", "./scripts.list.view", "./scripts.list.toolbar.view",
        "./scripts.model", "./scripts.detail.view",
        "./scripts.template.playground.view", "./scripts.template.standard.view", 
        "./scripts.template.standard.model", "./scripts.toolbar.view"],
    function(app, Marionette, Backbone, ScriptsListModel, ScriptsListView, ScriptsListToolbarView, ScriptsModel, ScriptsDetailView, PlaygroundTemplateView, 
        StandardTemplateView, StandardTemplateModel, ToolbarView) {

        app.module("scripts", function(module) {

            var Router = Backbone.Router.extend({
                initialize: function() {
                    app.listenTo(app, "script-saved", function(model) {
                        window.location.hash = "/extension/scripts/detail/" + model.get("shortid");
                    });
                },

                routes: {
                    "extension/scripts/list": "scripts",
                    "extension/scripts/detail/:id": "scriptsDetail",
                    "extension/scripts/detail": "scriptsDetail",
                },

                scripts: function() {
                    this.navigate("/extension/scripts/list");

                    var model = new ScriptsListModel();

                    app.layout.showToolbarViewComposition(new ScriptsListView({ collection: model }), new ScriptsListToolbarView({ collection: model }));


                    model.fetch();
                },

                scriptsDetail: function(id) {
                    var model = new ScriptsModel();

                    app.layout.showToolbarViewComposition(new ScriptsDetailView({ model: model }), new ToolbarView({ model: model }));

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch();
                    }
                },

                scriptsCreate: function() {
                    app.layout.dialog.show(new ScriptsCreateView({
                        model: new ScriptsModel()
                    }));
                }
            });


            app.scripts.router = new Router();

            if (!app.settings.playgroundMode) {

                app.on("menu-render", function(context) {
                    context.result += "<li><a href='/#/extension/scripts/list'>Scripts</a></li>";
                });

                app.on("menu-actions-render", function(context) {
                    context.result += "<li><a id='createScriptLink' href='/#/extension/scripts/detail'>Create Script</a></li>";
                });
            }

            app.on("template-extensions-render", function(context) {
                if (app.settings.playgroundMode) {
                    var view = new PlaygroundTemplateView();
                    view.setTemplateModel(context.template);
                    context.extensionsRegion.show(view);
                } else {
                    var model = new StandardTemplateModel();
                    model.setTemplate(context.template);

                    model.fetch({
                        success: function() {
                            var view = new StandardTemplateView({ model: model });
                            context.extensionsRegion.show(view);
                        }
                    });
                }
            });

            app.on("entity-registration", function(context) {

                $data.Class.define("$entity.Script", $data.Entity, null, {
                    'content': { 'type': 'Edm.String' },
                    'name': { 'type': 'Edm.String' },
                    'shortid': { 'type': 'Edm.String' },
                    "creationDate": { type: "date" },
                    "modificationDate": { type: "date" },
                }, null);

                $entity.Script.prototype.toString = function() {
                    return "Script " + (this.name || "");
                };

                if (app.settings.playgroundMode) {
                    $entity.Template.addMember("script", { 'type': "$entity.Script" });
                } else {
                    $entity.Template.addMember("scriptId", { 'type': "Edm.String" });
                    $entity.Script.addMember('_id', { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' });
                    context["scripts"] = { type: $data.EntitySet, elementType: $entity.Script };
                }
            });
        });
    });