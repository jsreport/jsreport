define(["app", "core/basicModel"], function(app, ModelBase) {

    return ModelBase.extend({
        odata: "data",
        url: "odata/data",

        toString: function() {
            return "Data Item " + (this.get("name") || "");
        }
    });
});