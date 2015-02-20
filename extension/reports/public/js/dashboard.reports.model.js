define(["app", "backbone", "./report.model"], function (app, Backbone, ReportModel) {
    return Backbone.Collection.extend({

        url: function() {
            return "odata/reports?$orderby=modificationDate desc&$top=4";
        },

        model: ReportModel
    });
});
