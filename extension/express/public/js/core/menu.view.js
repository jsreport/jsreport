define(["app", "marionette", "underscore", "core/view.base", "backbone"], function (app, Marionette, _, ViewBase, Backbone) {
    return ViewBase.extend({
        template: "menu",
        renderMenuActionPartsContext: null,
        
        initialize: function() {
            var self = this;
            _.bindAll(this, "renderMenuActionParts");
            this.listenTo(this, "render", function () {
                if (self.renderMenuActionPartsContext != null)
                    self.renderMenuActionPartsContext.trigger("after-render", self.$el);
            });
        },
        
        renderMenuParts: function () {
            var context = { result: "" };
            app.trigger("menu-render", context);

            return context.result;
        },
        
        renderMenuActionParts: function () {
            this.renderMenuActionPartsContext = { result: "" };
            _.extend(this.renderMenuActionPartsContext, Backbone.Events);
            app.trigger("menu-actions-render", this.renderMenuActionPartsContext);

            return this.renderMenuActionPartsContext.result;
        },
    });
});
