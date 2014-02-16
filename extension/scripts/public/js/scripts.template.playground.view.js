define(["marionette", "app", "./scripts.template.playground.dialog", "./scripts.template.playground.model", "core/view.base"], function (Marionette, app, DialogView, Model, ViewBase) {
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
                model.set("script", new $entity.Script());
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