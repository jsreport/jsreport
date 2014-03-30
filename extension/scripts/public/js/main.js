
define('scripts.model',["app", "core/jaydataModel", "jquery"], function (app, ModelBase, $) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.scripts; },

       fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid == this.id; }, { id: this.get("shortid") });
        },    
        
        defaults: {
            name: "script name"    
        },
        
        setTemplateModel: function(templateModel) {
            this.templateModel = templateModel;
        },
        
        _initialize: function () {
            this.Entity = $entity.Script;
        },
    });
});


define('scripts.list.model',["app", "backbone", "core/dataGrid", "scripts.model"], function (app, Backbone, DataGrid, ScriptModel) {
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
            return app.dataContext.scripts.applyFilter(this.filter).toArray();
        },

        model: ScriptModel,
    });
});




define('scripts.list.view',["marionette", "core/dataGrid", "core/view.base"], function (Marionette, DataGrid, ViewBase) {
    return ViewBase.extend({
        template: "scripts-list",

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
                    window.location.hash = "extension/scripts/detail/" + id;
                },
                el: $("#scriptsGridBox"),
                headerTemplate: "scripts-list-header",
                rowsTemplate: "scripts-list-rows"
            });
        },
    });
}); 
define('scripts.list.toolbar.view',["jquery", "app", "codemirror", "core/utils", "core/view.base", "underscore"],
    function($, app, CodeMirror, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "scripts-list-toolbar",

            initialize: function() {
            },         
            
            events: {
                "click #deleteCommand": "deleteCommand",
            },

            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            },
        });
    });
define('scripts.detail.view',["marionette", "codemirror", "core/view.base", "core/codeMirrorBinder"], function(Marionette, CodeMirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "scripts-detail",

        initialize: function() {
            this.listenTo(this.model, "sync", this.render);
        },

        onDomRefresh: function() {

            var top = $("#contentWrap").position().top;

            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
                lineWrapping: true,
                viewportMargin: Infinity,
                iframeClass: 'CodeMirror'
            });            
            
            
            codeMirrorBinder(this.model, "content", this.contentCodeMirror);

            $(this.contentCodeMirror.getWrapperElement()).addClass(this.$el.find("#contentArea").attr('class'));
            $(this.contentCodeMirror.getWrapperElement()).css("margin-top", top);

            this.contentCodeMirror.refresh();
        },

        validateLeaving: function() {
            return !this.model.hasChangesSyncLastSync();
        },
    });
});
define('scripts.template.playground.dialog',["marionette", "app", "codemirror", "core/codeMirrorBinder", "core/view.base"], function (Marionette, app, Codemirror, codeMirrorBinder, ViewBase) {
    return ViewBase.extend({
        template: "scripts-dialog",
        
        events: {
            "click #saveCommand": "save",
        },
        
        onDomRefresh: function () {
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
            });
            codeMirrorBinder(this.model, "content", this.contentCodeMirror);
            
            $(this.contentCodeMirror.getWrapperElement()).addClass(this.$el.find("#contentArea").attr('class'));
            
            this.contentCodeMirror.refresh();
        },
        
        save: function () {
            var self = this;
            this.model.save({
                success: function () {
                    self.trigger("dialog-close");
                }
            });
        }
    });
});
define('scripts.template.playground.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
    return ModelBase.extend({
       
        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
            this.set("content", templateModel.get("script").content);
        },
        
        save: function (options) {
            this.templateModel.get("script").dataJson = this.get("content");
            return options.success();
        },
    });
});


define('scripts.template.playground.view',["marionette", "app", "scripts.template.playground.dialog", "scripts.template.playground.model", "core/view.base"], function (Marionette, app, DialogView, Model, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "scripts-template-playground",
        
        initialize: function () {
            var self = this;
            _.bindAll(this, "isFilled");
        },
        
        setTemplateModel: function (model) {
            this.templateModel = model;

            if (model.get("script") == null)
                model.attributes["script"] = new $entity.Script();
        },
        
        events: {
            "click #scriptCommand": "openDialog",
        },
        
        isFilled: function () {
             return (this.templateModel.get("script") != null) && (this.templateModel.get("script").content != null);
        },
        
        openDialog: function () {
            var self = this;
            var model = new Model();
            model.setTemplateModel(this.templateModel);
            var dialog = new DialogView({
                model: model
            });
            self.listenTo(dialog, "dialog-close", function () {
                self.render();
                self.templateModel.save();
            });
            app.layout.dialog.show(dialog);
        }
    });
});
define('scripts.template.standard.view',["app", "marionette", "core/view.base", "core/utils",], function(app, Marionette, ViewBase, Utils) {
    return ViewBase.extend({
        tagName: "li",
        template: "scripts-template-standard",
         
        initialize: function() {
            _.bindAll(this, "isFilled", "getItems", "getItemsLength");
        },

        isFilled: function() {
            return this.model.templateModel.get("scriptId");
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
define('scripts.template.standard.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;
            
            app.dataContext.scripts.toArray().then(function (items) {
                self.items = items.map(function(i) { return i.initData; });
                var empty = { name: "- not selected -", shortid: null, _id: null };
                self.items.unshift(empty);

                if (self.templateModel.get("scriptId"))
                  self.set(_.findWhere(items, { shortid: self.templateModel.get("scriptId") }).toJSON(), { silent: true });
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
             addProperty("scriptId", this.get("shortid"));
        },
 
        initialize: function () {
            var self = this;
            this.listenTo(this, "change:shortid", function() {
                self.templateModel.set("scriptId", self.get("shortid"));
                self.set(_.findWhere(self.items, { shortid: self.get("shortid")}));
            });
        },
    });
});
define('scripts.toolbar.view',["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "scripts-toolbar",

            initialize: function() {
                $(document).on('keydown', this.hotkey.bind(this));
            },

            events: {
                "click #saveCommand": "save",
            },

            save: function() {
                var self = this;
                this.model.save({}, {
                    success: function() {
                        app.trigger("script-saved", self.model);
                    }
                });
            },

            onDomRefresh: function() {
                var self = this;
            },

            hotkey: function(e) {
                if (e.ctrlKey && e.which === 83) {
                    this.save();
                    e.preventDefault();
                    return false;
                }
            },

            onClose: function() {
                $(document).off("keydown", this.hotkey);
            }
        });
    });
define(["app", "marionette", "backbone",
        "scripts.list.model", "scripts.list.view", "scripts.list.toolbar.view",
        "scripts.model", "scripts.detail.view",
        "scripts.template.playground.view", "scripts.template.standard.view", 
        "scripts.template.standard.model", "scripts.toolbar.view"],
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
                    context.result += "<li><a href='/#/extension/scripts/detail'>Create Script</a></li>";
                });
            }

            app.on("template-extensions-render", function(context) {
                if (app.settings.playgroundMode) {
                    var view = new PlaygroundTemplateView();
                    view.setTemplateModel(context.template);
                    context.extensionsRegion.show(view, "scripts");
                } else {
                    var model = new StandardTemplateModel();
                    model.setTemplate(context.template);

                    model.fetch({
                        success: function() {
                            var view = new StandardTemplateView({ model: model });
                            context.extensionsRegion.show(view, "scripts");
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