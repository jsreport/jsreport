define(["jquery", "app", "marionette", "core/utils", "core/view.base"],
    function($, app, Marionette, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "report-toolbar",

            initialize: function() {
                var self = this;
                this.listenTo(this, "render", function() {
                    var contextToolbar = {
                        name: "report-detail",
                        model: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("toolbar-render", contextToolbar);
                });
            },

            regions: {
                extensionsToolbarRegion: {
                    selector: "#extensionsToolbarBox",
                    regionType: Marionette.MultiRegion
                }
            }
        });
    });