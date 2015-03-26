define(["app", "backbone", "./report.model"], function (app, Backbone, ReportModel) {
    return Backbone.Collection.extend({

        url: function() {
            return "odata/reports?$orderby=creationDate desc&$top=4";
        },

        model: ReportModel
    });
});
