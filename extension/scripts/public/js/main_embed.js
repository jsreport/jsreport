/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "underscore", "app", "marionette", "backbone", "core/view.base", "core/listenerCollection", "./scripts.template.standard.model", "./scripts.template.standard.view",
        "core/aceBinder"],
    function ($, underscore, app, Marionette, Backbone, ViewBase, ListenerCollection, TemplateStandardModel, TemplateStandardView, aceBinder) {

        return app.module("scripts", function (module) {

            var TemplateView = ViewBase.extend({
                template: "embed-scripts-template-extension",

                initialize: function() {
                    _.bindAll(this, "getItems");
                    var self = this;
                    this.listenTo(this.model, "change:shortid", function() {
                        self.contentEditor.setOptions({
                            readOnly: self.model.get("shortid") !== "custom"
                        });
                    })
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
                        readOnly: this.model.get("shortid") !== "custom"
                    });

                    aceBinder(this.model, "content", this.contentEditor);
                }
            });


            app.on("extensions-menu-render", function(context) {
                context.result += "<li><a id='scriptsMenuCommand'><i class='fa fa-cloud-download'></i></a></li>";

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

            app.on("entity-registration", function (context) {

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
                context["scripts"] = { type: $data.EntitySet, elementType: $entity.Script };
            });
        });
    });