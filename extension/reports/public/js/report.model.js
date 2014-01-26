define(["app", "core/jaydataModel"], function (app, ModelBase) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.reports; },

        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid == this.id; }, { id: this.get("shortid") });
        },
        
        _initialize: function () {
            this.Entity = $entity.Report;
        },
    });
});

