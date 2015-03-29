define(["core/view.base", "underscore"], function(ViewBase, _) {
    return ViewBase.extend({
        template: "report-detail",

        initialize: function () {
            this.listenTo(this.model, "sync", this.render);
        }
    });
});
