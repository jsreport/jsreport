/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "marionette", "underscore", "core/view.base", "backbone"], function (app, Marionette, _, ViewBase, Backbone) {
    return ViewBase.extend({
        template: "menu",
        renderMenuActionPartsContext: null,
        renderAdditionalUserInfoContext: null,
        
        initialize: function() {
            var self = this;
            _.bindAll(this, "renderMenuActionParts", "renderAdditionalUserInfo");

            this.listenTo(this, "render", function () {
                if (self.renderMenuActionPartsContext !== null)
                    self.renderMenuActionPartsContext.trigger("after-render", self.$el);

                if (self.renderAdditionalUserInfoContext !== null)
                    self.renderAdditionalUserInfoContext.trigger("after-render", self.$el);
            });
        },

        onDomRefresh: function() {
            var $actionsDdl = this.$el.find("#actionsDropDown");

            if ($actionsDdl.find("li").length === 1)
                $actionsDdl.hide();
        },
        
        renderMenuParts: function () {
            var context = { result: "" };
            app.trigger("menu-render", context);

            return context.result;
        },

        renderAdditionalUserInfo: function () {
            this.renderAdditionalUserInfoContext = { result: "" };
            _.extend(this.renderAdditionalUserInfoContext, Backbone.Events);
            app.trigger("user-info-render", this.renderAdditionalUserInfoContext);

            return this.renderAdditionalUserInfoContext.result;
        },
        
        renderMenuActionParts: function () {
            this.renderMenuActionPartsContext = { result: "" };
            _.extend(this.renderMenuActionPartsContext, Backbone.Events);
            app.trigger("menu-actions-render", this.renderMenuActionPartsContext);

            return this.renderMenuActionPartsContext.result;
        }
    });
});
