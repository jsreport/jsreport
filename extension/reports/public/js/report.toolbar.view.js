define(["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "report-toolbar",

            events: {
                "click #downloadCommand": "download",
            },

            download: function() {
                //window.location.assign(app.serverUrl + "report/" + this.model.get("shortid") + "/content");
            },
        });
    });