define(["app", "marionette", "core/view.base", "core/utils", "./data.template.playground.dialog", "./data.template.playground.model"], function (app, Marionette, ViewBase, Utils, DialogView, Model) {
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

            if (model.get("dataItem") == null)
                model.attributes["dataItem"] = new $entity.DataItem();
        },
        

        openDialog: function () {
            var self = this;
            var model = new Model();
            model.setTemplateModel(this.templateModel);
            var dialog = new DialogView({ model: model });
            self.listenTo(dialog, "dialog-close", function() {
                self.render();
                self.templateModel.save();
            });
            
            app.layout.dialog.show(dialog);
        }
    });
});

