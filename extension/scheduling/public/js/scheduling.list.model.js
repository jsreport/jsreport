define(["app", "backbone", "core/dataGrid", "./scheduling.model"], function (app, Backbone, DataGrid, DataModel) {
    return Backbone.Collection.extend({

        url: function () {
            var qs = this.filter.toOData();
            qs.$orderby = "modificationDate desc";
            return "odata/schedules?" + $.param(qs);
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

        model: DataModel
    });
});



