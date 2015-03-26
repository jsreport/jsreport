define(["app", "backbone", "core/dataGrid"], function (app, Backbone, DataGrid) {

    var Model = Backbone.Model.extend({});

    return Backbone.Collection.extend({

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

        url: function () {
            var qs = this.filter.toOData();
            qs.$orderby = "finishDate desc";
            qs.$filter = "scheduleShortid eq " + this.scheduleShortid;

            return "odata/tasks?" + $.param(qs);
        },

        model: Model
    });
});



