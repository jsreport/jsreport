define(["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "report-toolbar",

            events: {
                "click #downloadCommand": "download",
            },

            download: function() {
                var self = this;
            },
        });
    });