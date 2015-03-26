/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "jquery", "core/basicModel"], function(app, $, ModelBase) {

    return ModelBase.extend({
        odata: "templates",
        url: "odata/templates",

        toString: function() {
            return "Template " + (this.get("name") || "");
        },

        defaults: {
            engine: "handlebars",
            recipe: "phantom-pdf"
        }
    });
});