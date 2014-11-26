define(["app", "underscore", "marionette", "core/view.base"], function(app, _, Marionette, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "phantom-template",
         
          initialize: function() {
            _.bindAll(this, "isFilled");
        },

        isFilled: function() {
            return this.model.isDirty();
        },
        
         onClose: function() {
             this.model.templateModel.unbind("api-overrides", this.model.apiOverride, this.model);
         }
    });
});