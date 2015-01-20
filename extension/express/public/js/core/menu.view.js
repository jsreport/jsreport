/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "marionette", "underscore", "core/view.base", "backbone"], function (app, Marionette, _, ViewBase, Backbone) {
    return ViewBase.extend({
        template: "menu",
        renderMenuActionPartsContext: null,
        renderUserInfoContext: null,
        
        initialize: function() {
            var self = this;
            _.bindAll(this, "renderMenuActionParts", "renderUserInfo");

            this.listenTo(this, "render", function () {
                if (self.renderMenuActionPartsContext !== null)
                    self.renderMenuActionPartsContext.trigger("after-render", self.$el);

                if (self.renderUserInfoContext !== null)
                    self.renderUserInfoContext.trigger("after-render", self.$el);
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

        renderUserInfo: function () {
            this.renderUserInfoContext = { result: "" };
            _.extend(this.renderUserInfoContext, Backbone.Events);
            app.trigger("user-info-render", this.renderUserInfoContext);

            return this.renderUserInfoContext.result;
        },
        
        renderMenuActionParts: function () {
            this.renderMenuActionPartsContext = { result: "" };
            _.extend(this.renderMenuActionPartsContext, Backbone.Events);
            app.trigger("menu-actions-render", this.renderMenuActionPartsContext);

            return this.renderMenuActionPartsContext.result;
        }
    });
});
