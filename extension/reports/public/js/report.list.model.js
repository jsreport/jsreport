define(["backbone", "app", "./report.model", "core/dataGrid"], function (Backbone, app, ReportModel, DataGrid) {
    return Backbone.Collection.extend({
        initialize: function () {
            var self = this;
            this.filter = new DataGrid.Filter.Base();
            this.filter.bind("apply", function () {
                self.fetch();
            });
        },
        
        parse: function (data) {
            if (data.totalCount != null)
                this.filter.set("totalCount", data.totalCount);

            return data;
        },

        fetchQuery: function () {
            return app.dataContext.reports
                .orderByDescending(function (t) { return t.creationDate; })
                .applyFilter(this.filter).toArray();
        },


        model: ReportModel
    });
});

