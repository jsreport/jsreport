define(["app", "marionette", "core/view.base"], function(app, Marionette, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "childTemplates-template",
         
          initialize: function() {
            _.bindAll(this, "isFilled");
        },

        isFilled: function() {
            return this.model.get("isChildTemplate");
        },
    });
});