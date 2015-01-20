define(["app", "core/jaydataModel"], function (app, ModelBase) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.reports; },

        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r._id === this._id; }, { _id: this.get("_id") });
        },
        
        _initialize: function () {
            this.Entity = $entity.Report;
        },

        toString: function() {
            return "Report " + (this.get("name") || "");
        }
    });
});

