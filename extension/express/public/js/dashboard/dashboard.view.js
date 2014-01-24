define(["marionette", "app"],
    function (Marionette, app) {
    return Marionette.Layout.extend({
        template: "dashboard",
        
        initialize: function () {
            var self = this;
          
            this.listenTo(this, "render", function () {
                app.trigger("dashboard-extensions-render", self.extensionsRegion);
            });
        },

        regions: {
            extensionsRegion: {
                selector: "#dashboardBox",
                regionType: Marionette.MultiRegion
            }
        },
    });
});