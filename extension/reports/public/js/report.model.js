define(["app", "core/basicModel"], function (app, ModelBase) {
    return ModelBase.extend({
        odata: "reports",

        toString: function() {
            return "Report " + (this.get("name") || "");
        }
    });
});

