define(["marionette", "app", "./images.dialog.view", "./images.ref.model", "core/view.base"], function (Marionette, app, DialogView, Model, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "images-template",

        initialize: function () {
            var self = this;
            _.bindAll(this, "isFilled");
        },

        setTemplateModel: function (model) {
            this.templateModel = model;
        },

        events: {
            "click #imagesCommand": "openDialog",
        },

        isFilled: function () {
            return this.templateModel.get("images") && this.templateModel.get("images").length != 0;
        },
            
     
        openDialog: function () {
            var self = this;
            var model = new Model();
            model.setTemplateModel(this.templateModel);
            model.fetch({
                success: function () {
                    var dialog = new DialogView({
                        collection: model
                    });
                    self.listenTo(dialog, "dialog-close", function () { self.render(); });
                    app.layout.dialog.show(dialog);
                }
            });
        }
    });
});