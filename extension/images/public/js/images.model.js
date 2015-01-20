define(["app", "backbone", "core/jaydataModel"], function (app, Backbone, ModelBase) {
    
    return ModelBase.extend({
        contextSet: function() { return app.dataContext.images; },
        
        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid === this.id; }, { id: this.get("shortid") });
        },

        _initialize: function() {
            var self = this;
            this.Entity = $entity.Image;
        },

        toString: function() {
            return "Image " + (this.get("name") || "");
        }
    });
});