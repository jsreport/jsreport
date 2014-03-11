define(["app", "marionette", "core/view.base"], function(app, Marionette, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "phantom-template",
         
          initialize: function() {
            _.bindAll(this, "isFilled");
        },

        isFilled: function() {
            return this.model.get("margin") != null || this.model.get("header")  != null || this.model.get("footer") != null;
        },
        
         onClose: function() {
             this.model.templateModel.unbind("api-overrides", this.model.apiOverride, this.model);
         }
    });
});