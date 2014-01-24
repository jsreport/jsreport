define(["app", "backbone", "core/jaydataModel"], function (app, Backbone, ModelBase) {
    
    return ModelBase.extend({
        contextSet: function() { return app.dataContext.images; },

        fetchQuery: function() {
            return app.dataContext.images.find(this.get("_id"));
        },

        _initialize: function() {
            var self = this;
            this.Entity = $entity.Image;
        },
    });
});