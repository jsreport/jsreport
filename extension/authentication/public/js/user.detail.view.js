define(["marionette", "core/view.base", "core/aceBinder"], function(Marionette, ViewBase, aceBinder) {
    return ViewBase.extend({
        template: "user-detail",

        initialize: function() {
            var self = this;
            this.listenTo(this.model, "sync", self.render);
        }
    });
});