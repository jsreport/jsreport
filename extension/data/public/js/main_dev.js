define(["app", "marionette", "backbone",
        "./data.list.model", "./data.list.view", "./data.list.toolbar.view",
        "./data.model", "./data.detail.view",
        "./data.template.view", "./data.toolbar.view"],
    function(app, Marionette, Backbone, DataListModel, DataListView, DataListToolbarView, DataModel, DataDetailView, TemplateView, ToolbarView) {

        app.module("data", function(module) {
            var Router = Backbone.Router.extend({                
                initialize: function() {
                    app.listenTo(app, "data-saved", function(model) {
                        window.location.hash = "/extension/data/detail/" + model.get("shortid");
                    });
                },

                routes: {
                    "extension/data/list": "data",
                    "extension/data/detail/:id": "dataDetail",
                    "extension/data/detail": "dataDetail",
                },

                data: function() {
                    this.navigate("/extension/data/list");

                    var model = new DataListModel();

                    app.layout.showToolbarViewComposition(new DataListView({ collection: model }), new DataListToolbarView({ collection: model }));


                    model.fetch();
                },

                dataDetail: function(id) {
                    var model = new DataModel();
                    app.layout.showToolbarViewComposition(new DataDetailView({ model: model }), new ToolbarView({ model: model }));

                    if (id != null) {
                        model.set("shortid", id);
                        model.fetch();
                    }
                },
            });

            app.data.on("created", function() {
                app.data.router.data();
            });

            app.data.router = new Router();

            if (!app.settings.playgroundMode) {

                app.on("menu-render", function(context) {
                    context.result += "<li><a href='#/extension/data/list'>Data</a></li>";
                });

                app.on("menu-actions-render", function(context) {
                    context.result += "<li><a href='#/extension/data/detail'createDataLink'>Create Data</a></li>";
                });
            }

            app.on("template-extensions-render", function(context) {
                var view = new TemplateView();
                view.setTemplateModel(context.template);
                context.extensionsRegion.show(view);
            });


            app.on("template-extensions-get-state", function(model, state) {
                if (!app.settings.playgroundMode) {
                    state.dataItemId = model.get("dataItemId");
                    return;
                }

                if (model.get("dataItem") != null && model.get("dataItem").dataJson != null)
                    state.dataItem = model.get("dataItem").dataJson;
                else
                    state.dataItem = null;
            });


            app.on("entity-registration", function(context) {

                $data.Class.define("$entity.DataItem", $data.Entity, null, {
                    'shortid': { 'type': 'Edm.String' },
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