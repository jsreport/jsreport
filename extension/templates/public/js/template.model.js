/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "core/jaydataModel"], function (app, ModelBase) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.templates; },

        fetchQuery: function (cb) {

            var predicate = app.settings.playgroundMode ?
                function(t) { return t.shortid == this.id && t.version == this.version; } :
                function(t) { return t.shortid == this.id; };
                
            return app.dataContext.templates.single(predicate,
                { id: this.get("shortid"), version: this.get("version") == null ? 1 : this.get("version") });
        },

        _initialize: function () {
            this.Entity = $entity.Template;
        },

        defaults: {
            engine: "jsrender",
            recipe: "html"
        },
    });
});
