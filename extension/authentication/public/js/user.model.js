define(["app", "core/basicModel"], function(app, ModelBase) {

    return ModelBase.extend({
        odata: "users",
        url: "odata/users",

        toString: function() {
            return "User " + (this.get("username") || "");
        }
    });
});