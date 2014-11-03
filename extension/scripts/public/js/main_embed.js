/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "underscore", "app", "marionette", "backbone", "core/view.base", "core/listenerCollection", "./scripts.template.standard.model", "./scripts.template.standard.view",
        "core/aceBinder", "./scripts.entityRegistration"],
    function ($, underscore, app, Marionette, Backbone, ViewBase, ListenerCollection, TemplateStandardModel, TemplateStandardView,
              aceBinder, entityRegistration) {

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

            app.on("entity-registration", entityRegistration);
        });
    });