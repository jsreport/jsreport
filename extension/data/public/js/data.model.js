define(["app", "core/jaydataModel"], function(app, ModelBase) {

    return ModelBase.extend({
        contextSet: function() { return app.dataContext.data; },

        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid == this.id; }, { id: this.get("shortid") });
        },   
        
        defaults: {
            name: "data item name"
        },

        _initialize: function() {
            var self = this;
            this.Entity = $entity.DataItem;
        },
    });
});