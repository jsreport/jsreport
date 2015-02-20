﻿define(["app", "backbone", "core/basicModel"], function (app, Backbone, ModelBase) {
    
    return ModelBase.extend({
        odata: "images",

        toString: function() {
            return "Image " + (this.get("name") || "");
        }
    });
});