/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "jquery", "core/jaydataModel"], function(app, $, ModelBase) {
    return ModelBase.extend({
        contextSet: function() { return app.dataContext.templates; },

        fetchQuery: function() {
            if (!this.get("shortid")) {
                return $.Deferred().reject(new Error("shortid not present on this template model."));
            }

            var predicate = function(t) { return t.shortid === this.id; };

            return app.dataContext.templates.single(predicate,
                { id: this.get("shortid") });
        },

        _initialize: function() {
            this.Entity = $entity.Template;
        },

        toString: function() {
            return "Template " + (this.get("name") || "");
        },

        defaults: {
            engine: "handlebars",
            recipe: "phantom-pdf"
        }
    });
});