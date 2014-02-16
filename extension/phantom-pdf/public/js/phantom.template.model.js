define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            
            if (templateModel.get("phantom") == null)
                    templateModel.set("phantom", new $entity.Phantom());
            
            this.set("margin", templateModel.get("phantom").margin);
        },

        initialize: function () {
            var self = this;
            this.listenTo(this, "change:margin", function() {
                self.templateModel.get("phantom").margin = self.get("margin");
            });
        },
    });
});