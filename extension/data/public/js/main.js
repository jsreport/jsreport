define(["app", "marionette", "backbone",
        "./data.list.model", "./data.list.view",
        "./data.model", "./data.detail.view",
        "./data.create.view", "./data.template.view", "./data.toolbar.view"],
    function(app, Marionette, Backbone, DataListModel, DataListView, DataModel, DataDetailView, DataCreateView, TemplateView, ToolbarView) {

        app.module("data", function(module) {
            var Router = Backbone.Router.extend({
                routes: {
                    "extension/data": "data",
                    "extension/data/:id": "dataDetail",
                },

                data: function() {
                    this.navigate("/extension/data");

                    var model = new DataListModel();
                    var view = new DataListView({
                        collection: model
                    });

                    app.layout.content.show(view);

                    model.fetch();
                },

                dataDetail: function(id) {
                    var model = new DataModel();
                    model.set("_id", id);
                    
                    app.layout.showToolbarViewComposition(new DataDetailView({model: model}), new ToolbarView({model: model}) );

                    model.fetch();
                },

                dataCreate: function() {
                    app.layout.dialog.show(new DataCreateView({
                        model: new DataModel()
                    }));
                }
            });

            app.data.on("created", function() {
                app.data.router.data();
            });

            app.data.on("create", function() {
                app.data.router.dataCreate();
            });

            app.data.router = new Router();

            if (!app.settings.playgroundMode) {

                app.on("menu-render", function(context) {
                    context.result += "<li><a href='#/extension/data'>Data</a></li>";
                });

                app.on("menu-actions-render", function(context) {
                    context.result += "<li><a id='createDataLink'>Create Data</a></li>";
                    context.on("after-render", function($el) {
                        $el.find("#createDataLink").click(function() {
                            app.data.router.dataCreate();
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
                if (model.get("dataItem") != null && model.get("dataItem").dataJson != null)
                    state.dataItem = model.get("dataItem").dataJson;
                else
                    state.dataItem = null;
            });

            app.on("entity-registration", function(context) {

                $data.Class.define("$entity.DataItem", $data.Entity, null, {
                    'name': { 'type': 'Edm.String' },
                    'dataJson': { 'type': 'Edm.String' },
                }, null);

                $entity.DataItem.prototype.toString = function() {
                    return "DataItem " + (this.name || "");
                };

                if (app.settings.playgroundMode) {
                    $entity.Template.addMember("dataItem", { 'type': "$entity.DataItem" });
                } else {
                    $entity.Template.addMember("dataItemId", { 'type': "Edm.String" });
                    $entity.DataItem.addMember('_id', { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' });
                    context["data"] = { type: $data.EntitySet, elementType: $entity.DataItem };
                }
            });
        });
    });