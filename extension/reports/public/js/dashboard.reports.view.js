define(["marionette"], function (Marionette) {
    
    return Marionette.ItemView.extend({
        template: "dashboard-reports",
    
        events: {
            "click tr": "showDetail"
        },
    
        initialize: function() {
            this.listenTo(this.collection, "sync", this.render);
        },
    
        showDetail: function (ev, data) {
            var id = $(ev.target).closest("tr").attr("data-id");
            window.location.hash = "extension/reports/" + id;
        }
    });
});