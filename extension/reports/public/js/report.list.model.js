define(["backbone", "app", "./report.model", "core/dataGrid"], function (Backbone, app, ReportModel, DataGrid) {
    return Backbone.Collection.extend({
        url: function() {
            var qs =  this.filter.toOData();
            qs.$orderby = "creationDate desc";
            return "odata/reports?" + $.param(qs);
        },

        initialize: function () {
            var self = this;
            this.filter = new DataGrid.Filter.Base();
            this.filter.bind("apply", function () {
                self.fetch();
            });
        },

        parse: function (data) {
            if (this.meta && this.meta["@odata.count"])
                this.filter.set("totalCount", this.meta["@odata.count"]);

            return data;
        },

        model: ReportModel
    });
});

