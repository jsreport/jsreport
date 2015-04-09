define(["app", "marionette", "backbone", "./resources.template.view", "./resources.template.model"],
    function (app, Marionette, Backbone, TemplateView, TemplateModel) {

        app.module("resources", function (module) {

            app.on("template-extensions-render", function (context) {

                var model = new TemplateModel();
                model.setTemplate(context.template);

                model.fetch().then(function () {
                    var view = new TemplateView({ model: model});
                    view.linkToTemplateView(context.view);
                    context.extensionsRegion.show(view, "resources");
                });
            });
        });
    });