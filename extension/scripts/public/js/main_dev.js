define(["app", "marionette", "backbone",
        "./scripts.list.model", "./scripts.list.view",
        "./scripts.model", "./scripts.detail.view",
        "./scripts.create.view", "./scripts.template.view", "./scripts.toolbar.view"],
    function(app, Marionette, Backbone, ScriptsListModel, ScriptsListView, ScriptsModel, ScriptsDetailView, ScriptsCreateView, TemplateView, ToolbarView) {

        app.module("scripts", function(module) {
            
            var Router = Backbone.Router.extend({
                routes: {
                    "extension/scripts": "scripts",
                    "extension/scripts/:id": "scriptsDetail",
                },

                scripts: function () {
                    this.navigate("/extension/scripts");

                    var model = new ScriptsListModel();
                    var view = new ScriptsListView({
                        collection: model
                    });

                    app.layout.content.show(view);

                    model.fetch();
                },

                scriptsDetail: function (id) {
                    var model = new ScriptsModel();
                    model.set("_id", id);
                    
                    app.layout.showToolbarViewComposition(new ScriptsDetailView({ model: model }), new ToolbarView({model: model}) );
                    
                    model.fetch();
                },

                scriptsCreate: function () {
                    app.layout.dialog.show(new ScriptsCreateView({
                        model: new ScriptsModel()
                    }));
                }
            });
            
            app.data.on("create", function () {
                app.scripts.router.scriptsCreate();
            });

            app.scripts.router = new Router();
            
            if (!app.settings.playgroundMode) {

                app.on("menu-render", function (context) {
                    context.result += "<li><a href='#/extension/scripts'>Scripts</a></li>";
                });

                app.on("menu-actions-render", function (context) {
                    context.result += "<li><a id='createScriptLink'>Create Script</a></li>";
                    context.on("after-render", function ($el) {
                        $el.find("#createScriptLink").click(function () {
                            app.scripts.router.scriptsCreate();
                        });
                    });
                });
            }

            app.on("template-extensions-render", function(context) {
                var view = new TemplateView();
                view.setTemplateModel(context.template);
                context.extensionsRegion.show(view);
            });

            app.on("template-extensions-get-state", function(model, state) {
                if (model.get("script") != null && model.get("script").content != null)
                    state.script = model.get("script").content;
                else
                    state.script = null;
            });

            app.on("entity-registration", function(context) {

                $data.Class.define("$entity.Script", $data.Entity, null, {
                    'content': { 'type': 'Edm.String' },
                    'name': { 'type': 'Edm.String' },
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