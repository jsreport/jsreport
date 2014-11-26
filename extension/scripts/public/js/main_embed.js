define('scripts.template.standard.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;

            function processItems(items) {
                self.items = items.map(function(i) { return i.initData; });

                var script = self.templateModel.get("script");

                if (!script) {
                    script = new $entity.ScriptRefType();

                    //back compatibility
                    if (self.templateModel.get("scriptId")) {
                        script.shortid = self.templateModel.get("scriptId");
                    }

                    self.templateModel.set("script", script);
                }


                var custom = { name: "- custom -", shortid: "custom", content:   script.content};
                self.items.unshift(custom);

                var empty = { name: "- not selected -", shortid: null };
                self.items.unshift(empty);

                if (!script.content && !script.shortid)
                    self.set(custom, { silent: true });

                if (script.shortid)
                    self.set(_.findWhere(items, { shortid: script.shortid }).toJSON(), { silent: true });

                if (script.content)
                    self.set(custom, { silent: true });

                return options.success();
            }

            if (app.options.scripts.allowChoosing) {
                app.dataContext.scripts.toArray().then(processItems);
            } else {
                processItems([]);
            }
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        apiOverride: function(addProperty) {
             addProperty("scriptId", this.get("shortid"));
        },

        newCustomScript: function() {

        },
 
        initialize: function () {
            var self = this;
            this.listenTo(this, "change:shortid", function() {
                self.templateModel.get("script").shortid = self.get("shortid") !== "custom" ? self.get("shortid") : undefined;
                self.templateModel.get("script").content = self.get("shortid") === "custom" ? self.get("content") : undefined;
                self.set(_.findWhere(self.items, { shortid: self.get("shortid")}));
            });

            this.listenTo(this, "change:content", function() {
                if (self.get("shortid") === "custom") {
                    self.templateModel.get("script").content = self.get("content");
                    _.findWhere(self.items, { shortid: "custom" }).content = self.get("content");
                }
            });
        }
    });
});
define('scripts.template.standard.view',["app", "marionette", "core/view.base", "core/utils"], function(app, Marionette, ViewBase, Utils) {
    return ViewBase.extend({
        tagName: "li",
        template: "scripts-template-standard",
         
        initialize: function() {
            _.bindAll(this, "isFilled", "getItems", "getItemsLength");
        },

        isFilled: function() {
            return this.model.get("shortid") || this.model.get("content");
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
define('scripts.entityRegistration',[], function() {
    return function(context) {
        $data.Class.define("$entity.Script", $data.Entity, null, {
            '_id':{ 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
            'content': { 'type': 'Edm.String' },
            'name': { 'type': 'Edm.String' },
            'shortid': { 'type': 'Edm.String' },
            "creationDate": { type: "date" },
            "modificationDate": { type: "date" }
        }, null);

        $data.Class.define("$entity.ScriptRefType", $data.Entity, null, {
            content: { type: 'Edm.String' },
            shortid: { type: 'Edm.String' }
        });

        $entity.Script.prototype.toString = function () {
            return "Script " + (this.name || "");
        };

        $entity.Template.addMember("script", { 'type': "$entity.ScriptRefType" });
        //back compatibility
        $entity.Template.addMember("scriptId", { 'type': "Edm.String" });

        context["scripts"] = { type: $data.EntitySet, elementType: $entity.Script };
    }
});
/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "underscore", "app", "marionette", "backbone", "core/view.base", "core/listenerCollection", "scripts.template.standard.model", "scripts.template.standard.view",
        "core/aceBinder", "scripts.entityRegistration"],
    function ($, _, app, Marionette, Backbone, ViewBase, ListenerCollection, TemplateStandardModel, TemplateStandardView,
              aceBinder, entityRegistration) {

        app.options.scripts = app.options.scripts || { allowChoosing: false};

        return app.module("scripts", function (module) {

            var TemplateView = ViewBase.extend({
                template: "embed-scripts-template-extension",

                initialize: function() {
                    _.bindAll(this, "getItems");
                    var self = this;
                    this.listenTo(this.model, "change:shortid", function() {
                        self.contentEditor.setOptions({
                            readOnly: self.model.get("shortid") !== "custom" && app.options.scripts.allowChoosing
                        });
                    });

                    this.listenTo(this, "animation-done", function() {
                        self.fixAcePosition();
                    });
                },

                getItems: function () {
                    return this.model.items;
                },

                onDomRefresh: function() {
                    this.contentEditor = ace.edit("contentArea");
                    this.contentEditor.setTheme("ace/theme/chrome");
                    this.contentEditor.getSession().setMode("ace/mode/javascript");
                    this.contentEditor.setOptions({
                        enableBasicAutocompletion: true,
                        enableSnippets: true,
                        readOnly: this.model.get("shortid") !== "custom" && app.options.scripts.allowChoosing
                    });

                    aceBinder(this.model, "content", this.contentEditor);

                    this.fixAcePosition();
                },

                fixAcePosition: function() {
                    var top = $("#contentWrap").position().top;
                    $("#contentArea").css("margin-top", top);
                }
            });


            app.on("extensions-menu-render", function(context) {
                context.result += "<li><a id='scriptsMenuCommand' title='define custom script (mostly loading data)'><i data-position='right' data-intro='Use custom script to load data or modify inputs' class='fa fa-cloud-download'></i></a></li>";

                context.on("after-render", function($el) {
                    $($el).find("#scriptsMenuCommand").click(function() {
                        var model = new TemplateStandardModel();
                        model.setTemplate(context.template);

                        model.fetch({ success: function () {
                            var view = new TemplateView({ model: model});
                            context.region.show(view, "scripts");
                        }});
                    });
                });
            });

            app.on("entity-registration", entityRegistration);
        });
    });
