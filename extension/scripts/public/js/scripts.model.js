define(["app", "core/basicModel", "jquery"], function (app, ModelBase, $) {
    return ModelBase.extend({
        odata: "scripts",
        url: "odata/scripts",

        toString: function() {
            return "Script " + (this.get("name") || "");
        }
    });
});

