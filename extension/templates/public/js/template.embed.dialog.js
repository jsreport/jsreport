define(["marionette", "app", "core/view.base"], function (Marionette, app, ViewBase) {
    return ViewBase.extend({
        template: "template-embed",
        
        initialize: function() {
            var self = this;

            this.listenTo(this.model, "change", function() {
                self.render();
            });
        }
    });
});