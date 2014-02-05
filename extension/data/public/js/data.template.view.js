define(["app", "marionette", "core/view.base", "core/utils", "./data.dialog.view", "./data.dialog.model"], function (app, Marionette, ViewBase, Utils, DialogView, Model) {
    return ViewBase.extend({
        tagName: "li",
        template: "data-template-extension",
        
        initialize: function () {
            _.bindAll(this, "isFilled");
        },

        events: {
            "click #dataItemCommand": "openDialog",
        },
        
        isFilled: function () {
            return this.templateModel.get("dataItemId") ||
                ((this.templateModel.get("dataItem") != null) && (this.templateModel.get("dataItem").dataJson != null));
        },
        
        setTemplateModel: function (model) {
            this.templateModel = model;
        },
        

        openDialog: function () {
            var self = this;
            var model = new Model();
            model.setTemplateModel(this.templateModel);
            model.fetch({
                success: function () {
                    var dialog = new DialogView({
                        model: model
                    });
                    self.listenTo(dialog, "dialog-close", function() {
                        self.render();
                        self.templateModel.save();
                    });
                    app.layout.dialog.show(dialog);
                }
            });
        }
    });
});

