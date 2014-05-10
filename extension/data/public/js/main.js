
define('data.model',["app", "core/jaydataModel"], function(app, ModelBase) {

    return ModelBase.extend({
        contextSet: function() { return app.dataContext.data; },

        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid == this.id; }, { id: this.get("shortid") });
        },   
        
        _initialize: function() {
            var self = this;
            this.Entity = $entity.DataItem;
        },
    });
});
define('data.list.model',["app", "backbone", "core/dataGrid", "data.model"], function (app, Backbone, DataGrid, DataModel) {
    return Backbone.Collection.extend({

        initialize: function () {
            var self = this;
            this.filter = new DataGrid.Filter.Base();
            this.filter.bind("apply", function () {
                self.fetch();
            });
        },
        
        parse: function (data) {
            if (data.totalCount != null)
                this.filter.set("totalCount", data.totalCount);

            return data;
        },
        
        fetchQuery: function () {
            return app.dataContext.data.applyFilter(this.filter).toArray();
        },

        model: DataModel,
    });
});




define('data.list.view',["marionette", "core/dataGrid", "core/view.base"], function (Marionette, DataGrid, ViewBase) {
    return ViewBase.extend({
        template: "data-list",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            this.dataGrid = DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "shortid",
                onShowDetail: function (id) {
                    window.location.hash = "extension/data/detail/" + id;
                },
                el: $("#schemaGridBox"),
                headerTemplate: "data-list-header",
                rowsTemplate: "data-list-rows"
            });
        },
    });
}); 
define('data.list.toolbar.view',["jquery", "app", "core/utils", "core/view.base", "underscore"],
    function ($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-list-toolbar",
            
            initialize: function () {
            },
         
            
            events: {
                "click #deleteCommand": "deleteCommand",
            },
            
            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            }
        });
    });


define('data.detail.view',["marionette", "core/view.base", "core/aceBinder"], function(Marionette, ViewBase, aceBinder) {
    return ViewBase.extend({
        template: "data-detail",

        initialize: function() {
            var self = this;
            this.listenTo(this.model, "sync", self.render);
        },

        onDomRefresh: function() {

            var top = $("#contentWrap").position().top;

            this.contentEditor = ace.edit("contentArea");
            this.contentEditor.setTheme("ace/theme/chrome");
            this.contentEditor.getSession().setMode("ace/mode/json");
            this.contentEditor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });
                
            aceBinder(this.model, "dataJson", this.contentEditor);

            $("#contentArea").css("margin-top", top);
        },

        validateLeaving: function() {
            return !this.model.hasChangesSyncLastSync();
        },
    });
});
define('data.template.playground.dialog',["marionette", "app", "core/view.base", "core/aceBinder"], function(Marionette, app, ViewBase, aceBinder) {
    return ViewBase.extend({
        template: "data-dialog",

        events: {
            "click #saveCommand": "save",
        },

        initialize: function() {
            _.bindAll(this, "save");
        },

        onDomRefresh: function() {

            this.contentEditor = ace.edit("contentArea");
            this.contentEditor.setTheme("ace/theme/chrome");
            this.contentEditor.getSession().setMode("ace/mode/json");
            this.contentEditor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });

            aceBinder(this.model, "dataJson", this.contentEditor);
        },

        save: function(s, e) {

            if (this.model.get("dataJson") != null && this.model.get("dataJson") !== "") {
                try {
                    var json = JSON.parse(this.model.get("dataJson"));
                } catch(e) {
                    alert("You must enter a valid JSON. e.g. { \"propertName\": \"propertyValue\"} ");
                    return;
                }
            }

            var self = this;
          
            this.model.save({
                success: function() {
                    self.trigger("dialog-close");
                }
            });
        }
    });
});
define('data.template.playground.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
            
            this.set("dataJson", templateModel.get("dataItem").dataJson);
        },
        
        save: function (options) {
            this.templateModel.get("dataItem").dataJson = this.get("dataJson");
            return options.success();
        },
    });
});
define('data.template.playground.view',["app", "marionette", "core/view.base", "core/utils", "data.template.playground.dialog", "data.template.playground.model"], function (app, Marionette, ViewBase, Utils, DialogView, Model) {
    return ViewBase.extend({
        tagName: "li",
        template: "data-template-extension-playground",
        
        initialize: function () {
            _.bindAll(this, "isFilled");
        },

        events: {
            "click #dataItemCommand": "openDialog",
        },
        
        isFilled: function () {
            return (this.templateModel.get("dataItem") != null) && (this.templateModel.get("dataItem").dataJson != null);
        },
        
        setTemplateModel: function (model) {
            this.templateModel = model;

            if (model.get("dataItem") == null)
                model.attributes["dataItem"] = new $entity.DataItem();
        },
        

        openDialog: function () {
            var self = this;
            var model = new Model();
            model.setTemplateModel(this.templateModel);
            var dialog = new DialogView({ model: model });
            self.listenTo(dialog, "dialog-close", function() {
                self.render();
                self.templateModel.save();
                app.layout.dialog.hide(dialog);
            });
            
            app.layout.dialog.show(dialog);
        }
    });
});


define('data.template.standard.view',["app", "marionette", "core/view.base", "core/utils",], function(app, Marionette, ViewBase, Utils) {
    return ViewBase.extend({
        tagName: "li",
        template: "data-template-extension-standard",
         
        initialize: function() {
            _.bindAll(this, "isFilled", "getItems", "getItemsLength");
        },

        isFilled: function() {
            return this.model.templateModel.get("dataItemId");
        },
        
        getItems: function () {
            return this.model.items;
        },
        
        getItemsLength: function () {
            return this.model.items.length;
        },
        
        onClose: function() {
            this.model.templateModel.unbind("api-overrides", this.model.apiOverride, this.model);
        }
    });
});
define('data.toolbar.view',["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-toolbar",

            initialize: function() {
                $(document).on('keydown.data-detail', this.hotkey.bind(this));
            },

            events: {
                "click #saveCommand": "save",
            },

            save: function() {
                if (!this.validate())
                    return;

                var self = this;
                this.model.save({}, {
                    success: function() {
                        app.trigger("data-saved", self.model);
                    }
                });
            },

            hotkey: function(e) {
                if (e.ctrlKey && e.which === 83) {
                    this.save();
                    e.preventDefault();
                    return false;
                }
            },

            onValidate: function() {
                var res = [];

                if (this.model.get("name") == null || this.model.get("name") == "")
                    res.push({
                        message: "Name cannot be empty"
                    });

                try {
                    var json = JSON.parse(this.model.get("dataJson"));
                } catch(e) {
                    res.push({
                        message: "Data must be valid JSON. e.g. { \"propertName\": \"propertyValue\"} <br/>" + e.toString()
                    });
                }

                return res;
            },

            onClose: function() {
                $(document).off(".data-detail");
            }
        });
    });
define('data.template.standard.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;
            
            app.dataContext.data.toArray().then(function (items) {
                self.items = items.map(function(i) { return i.initData; });
                var empty = { name: "- not selected -", shortid: null, _id: null };
                self.items.unshift(empty);

                if (self.templateModel.get("dataItemId"))
                  self.set(_.findWhere(items, { shortid: self.templateModel.get("dataItemId") }).toJSON(), { silent: true });
                else 
                  self.set(empty, { silent: true });
                
                return options.success();
            });
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        apiOverride: function(addProperty) {
            addProperty("dataItemId", this.get("shortid"));
        },

        initialize: function () {
            var self = this;
            this.listenTo(this, "change:shortid", function() {
                self.templateModel.set("dataItemId", self.get("shortid"));
                self.set(_.findWhere(self.items, { shortid: self.get("shortid")}));
            });
        },
    });
});
define(["app", "marionette", "backbone",    
        "data.list.model", "data.list.view", "data.list.toolbar.view",
        "data.model", "data.detail.view",
        "data.template.playground.view", "data.template.standard.view", 
        "data.toolbar.view", "data.template.standard.model"],
    function(app, Marionette, Backbone, DataListModel, DataListView, DataListToolbarView, DataModel, DataDetailView, TemplatePlaygroundView,
        TemplateStandardView, ToolbarView, TemplateStandardModel) {

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
                    context.result += "<li><a href='/#/extension/data/list'>Data</a></li>";
                });

                app.on("menu-actions-render", function(context) {
                    context.result += "<li><a href='/#/extension/data/detail' class='validate-leaving'>Create Data</a></li>";
                });
            }

            app.on("template-extensions-render", function(context) {
                if (app.settings.playgroundMode) {
                    var view = new TemplatePlaygroundView();
                    view.setTemplateModel(context.template);
                    context.extensionsRegion.show(view, "data");
                } else {
                    var model = new TemplateStandardModel();
                    model.setTemplate(context.template);
                    
                    model.fetch({ success: function() {
                        var view = new TemplateStandardView({ model: model});
                        context.extensionsRegion.show(view, "data");   
                    }});
                }
            });

            app.on("entity-registration", function(context) {

                $data.Class.define("$entity.DataItem", $data.Entity, null, {
                    'shortid': { 'type': 'Edm.String' },
                    'name': { 'type': 'Edm.String' },
                    "creationDate": { type: "date" },
                    "modificationDate": { type: "date" },
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