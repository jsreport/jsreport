define(["app", "marionette", "core/view.base", "core/utils"], function(app, Marionette, ViewBase, Utils) {
    return ViewBase.extend({
        tagName: "li",
        template: "data-template-extension-standard",
         
        initialize: function() {
            _.bindAll(this, "isFilled", "getItems", "getItemsLength");
        },

        isFilled: function() {
            return this.model.get("shortid") || this.model.get("dataJson");
        },
        
        getItems: function () {
            return this.model.items;
        },
        
        getItemsLength: function () {
            return this.model.items.length;
        },
        
        onClose: function() {
            this.model.templateModel.unbind("api-overrides", this.model.apiOverride, this.model);
        }
    });
});