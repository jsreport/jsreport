define(["app", "marionette", "underscore",  "core/view.base", "core/utils"], function(app, Marionette, _, ViewBase, Utils) {
    return ViewBase.extend({
        tagName: "li",
        template: "resources-template",

        initialize: function() {
            _.bindAll(this, "getItems", "isFilled");
        },

        getItems: function() {
            return this.model.items;
        },

        linkToTemplateView: function(view) {
            var self = this;
            this.templateView = view;
            this.templateView.beforeRenderListeners.add(function(request, cb) {
                request.options.language = self.model.get("language");
                cb();
            });
        },

        isFilled: function() {
            return this.model.get("resources") && this.model.get("resources").length > 0;
        },

        onDomRefresh: function () {
            this.$el.find('#resources').multiselect({
                enableFiltering: true
            });
        }
    });
});