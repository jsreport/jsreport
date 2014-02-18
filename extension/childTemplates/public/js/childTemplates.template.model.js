define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            
            this.set("isChildTemplate", templateModel.get("isChildTemplate"));
        },

        initialize: function () {
            var self = this;
            this.listenTo(this, "change", function() {
                self.templateModel.set("isChildTemplate", self.get("isChildTemplate"));
            });
        },
    });
});