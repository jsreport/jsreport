define(["app", "backbone", "./report.model"], function (app, Backbone, ReportModel) {
    return Backbone.Collection.extend({
        fetchQuery: function(cb) {
            return app.dataContext.reports
                .orderByDescending(function (t) { return t.creationDate; })
                .take(4).toArray();
        },

        model: ReportModel
    });
});
