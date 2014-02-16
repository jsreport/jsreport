
define('data.model',["app", "core/jaydataModel"], function(app, ModelBase) {

    return ModelBase.extend({
        contextSet: function() { return app.dataContext.data; },

        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid == this.id; }, { id: this.get("shortid") });
        },   
        
        defaults: {
            name: "data item name"
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
define('data.list.toolbar.view',["jquery", "app", "codemirror", "core/utils", "core/view.base", "underscore"],
    function ($, app, CodeMirror, Utils, LayoutBase) {
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


define('data.detail.view',["marionette", "codemirror", "core/view.base", "core/codeMirrorBinder"], function(Marionette, CodeMirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "data-detail",

        initialize: function () {
            var self = this;
            this.listenTo(this.model, "sync", self.render);
        },
        
        onDomRefresh: function () {
            
            var top = $("#contentWrap").position().top;
            
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
                lineWrapping: true
            });
            
             codeMirrorBinder(this.model, "dataJson", this.contentCodeMirror);
            
            $(this.contentCodeMirror.getWrapperElement()).addClass(this.$el.find("#contentArea").attr('class'));
            $(this.contentCodeMirror.getWrapperElement()).css("margin-top", top);

            this.contentCodeMirror.refresh();
        },
    });
});


define('data.template.playground.dialog',["marionette", "app", "codemirror", "core/view.base", "core/codeMirrorBinder"], function (Marionette, app, Codemirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "data-dialog",
        
        events: {
            "click #saveCommand": "save",
        },
        
        initialize: function() {
            _.bindAll(this, "save");
        },
        
        onDomRefresh: function () {
            
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
            });
            codeMirrorBinder(this.model, "dataJson", this.contentCodeMirror);
        },
        
        save: function () {
            var self = this;
            this.model.save({ success: function() {
                self.trigger("dialog-close");
            }});
        }
    });
});
define('data.template.playground.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var obj = this.templateModel.get("dataItem") || {};
            obj = obj.initData || {};
            this.set(this.parse(obj), {silent: true});
            return options.success();
        },

        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
        },
        
        save: function (options) {
            var self = this;
            var entity = new $entity.DataItem(this.attributes);
            
            this.templateModel.set("dataItem", entity);
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
        },
        

        openDialog: function () {
            var self = this;
            var model = new Model();
            model.setTemplateModel(this.templateModel);
            model.fetch({
                success: function () {
                    var dialog = new DialogView({
                        model: model
                    });
                    self.listenTo(dialog, "dialog-close", function() {
                        self.render();
                        self.templateModel.save();
                    });
                    app.layout.dialog.show(dialog);
                }
            });
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
    });
});
define('data.toolbar.view',["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-toolbar",

            events: {
                "click #saveCommand": "save",
            },

            save: function() {
                var self = this;
                this.model.save({}, {
                    success: function() {
                        app.trigger("data-saved", self.model);
                    }
                });
            },
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
                  self.set(_.findWhere(items, { shortid: self.templateModel.get("dataItemId") }), { silent: true });
                else 
                  self.set(empty, { silent: true });
                
                    
                
                return options.success();
            });
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
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
                    context.result += "<li><a href='/#/extension/data/detail'createDataLink'>Create Data</a></li>";
                });
            }

            app.on("template-extensions-render", function(context) {
                
                if (app.settings.playgroundMode) {
                    var view = new TemplatePlaygroundView();
                    view.setTemplateModel(context.template);
                    context.extensionsRegion.show(view);
                } else {
                    var model = new TemplateStandardModel();
                    model.setTemplate(context.template);
                    
                    model.fetch({ success: function() {
                        var view = new TemplateStandardView({ model: model});
                        context.extensionsRegion.show(view);     
                    }});
                }
            });


            app.on("template-extensions-get-state", function(model, state) {
                if (!app.settings.playgroundMode) {
                     if (model.get("dataItemId") == null)
                        return;
                    
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