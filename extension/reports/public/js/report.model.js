define(["app", "core/basicModel"], function (app, ModelBase) {
    return ModelBase.extend({
        odata: "reports",

        url: function() {
            return "odata/reports(" + this.get("_id") + ")";
        },

        toString: function() {
            return "Report " + (this.get("name") || "");
        }
    });
});

