define(["app", "core/jaydataModel"], function (app, ModelBase) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.reports; },

        fetchQuery: function (cb) {
            return this.contextSet().find(this.get("_id"));
        },
        
        _initialize: function () {
            this.Entity = $entity.Report;
        },
    });
});

