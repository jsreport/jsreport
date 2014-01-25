define(["core/view.base"], function(ViewBase) {
    return ViewBase.extend({
        template: "report-detail",

        initialize: function () {
            _.bindAll(this, "refresh");
            this.listenTo(this.model, "sync", this.refresh);
        },
        
        refresh: function() {
            
        }
    });
});
