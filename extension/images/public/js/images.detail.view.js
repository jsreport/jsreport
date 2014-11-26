define(["marionette", "core/view.base",], function (Marionette, ViewBase) {

    return ViewBase.extend({
        template: "images-detail",

        initialize: function () {
            var self = this;
            this.listenTo(this.model, "sync", this.render);
            this.listenTo(this.model, "change", this.render);
        }
    });
});

