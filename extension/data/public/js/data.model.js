define(["app", "core/jaydataModel"], function(app, ModelBase) {

    return ModelBase.extend({
        contextSet: function() { return app.dataContext.data; },

        fetchQuery: function() {
            return app.dataContext.data.find(this.get("_id"));
        },                

        _initialize: function() {
            var self = this;
            this.Entity = $entity.DataItem;
        },
    });
});