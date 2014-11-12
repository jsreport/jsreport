/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

define(["jquery", "underscore", "app", "marionette", "backbone", "core/view.base", "core/listenerCollection", "./data.template.model", "./data.template.view",
        "core/aceBinder", "./data.entityRegistration"],
    function ($, _, app, Marionette, Backbone, ViewBase, ListenerCollection, TemplateStandardModel,
              TemplateStandardView, aceBinder, entityRegistration) {

        return app.module("data", function (module) {

            var TemplateView = ViewBase.extend({
                template: "embed-data-template-extension",

                initialize: function () {
                    _.bindAll(this, "getItems");
                },

                getItems: function () {
                    return this.model.items;
                },

                onDomRefresh: function () {
                    this.contentEditor = ace.edit("contentArea");
                    this.contentEditor.setTheme("ace/theme/chrome");
                    this.contentEditor.getSession().setMode("ace/mode/json");
                    this.contentEditor.setOptions({
                        enableBasicAutocompletion: true,
                        enableSnippets: true,
                        readOnly: true
                    });

                    aceBinder(this.model, "dataJson", this.contentEditor);
                }
            });

            app.on("extensions-menu-render", function (context) {
                context.result += "<li><a id='dataMenuCommand'><i class='fa fa-file'></i></a></li>";

                context.beforeRenderListeners.add(function(req, cb) {
                    if (parent && parent.jsreport && parent.jsreport.template.data) {
                        req.data = JSON.stringify(parent.jsreport.template.data);
                    }

                    cb();
                });

                context.on("after-render", function ($el) {
                    var model = new TemplateStandardModel();
                    model.setTemplate(context.template);

                    model.fetch({ success: function () {
                        if (parent && parent.jsreport && parent.jsreport.template.data) {
                            model.set("shortid", "custom");
                            model.set("dataJson", JSON.stringify(parent.jsreport.template.data, undefined, 2));
                        }
                    } });

                    $($el).find("#dataMenuCommand").click(function () {
                        var view = new TemplateView({ model: model});
                        context.region.show(view, "data");
                    });
                });
            });


            app.on("entity-registration", entityRegistration);
        });
    });