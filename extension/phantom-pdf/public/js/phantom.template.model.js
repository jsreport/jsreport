define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            
            if (templateModel.get("phantom") == null) {
                 templateModel.set("phantom", new $entity.Phantom());
            }
            
            this.set(templateModel.get("phantom").initData);

            var self = this;
            this.listenTo(templateModel, "api-overrides", function(addProperty) {
                addProperty("phantom", {
                    maring: self.get("margin") || "...cm",
                    header: self.get("header") || "...",
                    footer: self.get("footer") || "..."
                });
            });
        },

        initialize: function () {
            var self = this;
            
            this.listenTo(this, "change", function() {
                self.copyAttributesToEntity(self.templateModel.get("phantom"));
            });
        },
    });
});