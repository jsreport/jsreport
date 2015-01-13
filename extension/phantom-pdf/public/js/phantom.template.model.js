define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            
            if (templateModel.get("phantom") == null) {
                 templateModel.set("phantom", new $entity.Phantom());
            }
            
            this.set(templateModel.get("phantom").initData);

            if (this.get("orientation") == null)
                this.set("orientation", "portrait");

            
            if (this.get("format") == null) {
                this.set("format", "A4");
            }

            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        isDirty: function() {
            return this.get("margin") != null || this.get("header") != null || this.get("footer") != null ||
                this.get("width") != null || this.get("height") != null || this.get("orientation") !== "portrait" ||
                this.get("format") !== "A4" || this.get("printDelay");
        },
        
        apiOverride: function(addProperty) {
            addProperty("phantom", {
                    maring: this.get("margin") || "...",
                    header: this.get("header") || "...",
                    footer: this.get("footer") || "...",
                    headerHeight: this.get("headerHeight") || "...",
                    footerHeight: this.get("footerHeight") || "...",
                    format: this.get("format") || "...",
                    orientation: this.get("orientation") || "...",
                    width: this.get("width") || "...",
                    height: this.get("height") || "...",
                    printDelay: this.get("printDelay") || "..."
                });
        },

        initialize: function () {
            var self = this;
            
            this.listenTo(this, "change", function() {
                self.copyAttributesToEntity(self.templateModel.get("phantom"));
            });
        }
    });
});