define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            
            if (templateModel.get("phantom") == null) {
                 templateModel.set("phantom", new $entity.Phantom());
            }
            
            this.set(templateModel.get("phantom").initData);

            var self = this;
            
            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        apiOverride: function(addProperty) {
            addProperty("phantom", {
                    maring: this.get("margin") || "...cm",
                    header: this.get("header") || "...",
                    footer: this.get("footer") || "...",
                    headerHeight: this.get("headerHeight") || "...",
                    footerHeight: this.get("footerHeight") || "..."
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