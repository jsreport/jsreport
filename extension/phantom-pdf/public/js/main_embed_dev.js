define(["jquery", "app", "marionette", "backbone", "core/view.base", "./phantom.template.model"],
    function ($, app, Marionette, Backbone, ViewBase, Model) {

        var TemplateView = ViewBase.extend({
            template: "embed-phantom-template",

            initialize: function () {
            }
        });


        app.on("extensions-menu-render", function (context) {
            context.result += "<li><a id='phantomMenuCommand' title='define pdf document options' style='display:none'><i data-position='right' data-intro='Define basic pdf settings' class='fa fa-file-pdf-o'></i></a></li>";

            context.on("after-render", function ($el) {
                if (context.template.get("recipe") === "phantom-pdf") {
                    $("#phantomMenuCommand").show();
                }
                else {
                    $("#phantomMenuCommand").hide();
                }

                $("#phantomMenuCommand").click(function () {
                    var model = new Model();
                    model.setTemplate(context.template);

                    var view = new TemplateView({ model: model});
                    context.region.show(view, "phantom");
                });
            });

            context.template.on("change:recipe", function () {
                if (context.template.get("recipe") === "phantom-pdf") {
                    $("#phantomMenuCommand").show();
                }
                else {
                    $("#phantomMenuCommand").hide();
                }
            });
        });
    });