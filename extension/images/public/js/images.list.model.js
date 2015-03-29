define(["app", "backbone", "core/dataGrid", "./images.model"], function (app, Backbone, DataGrid, ImageModel) {

    return Backbone.Collection.extend({

        url: function () {
            var qs = this.filter.toOData();
            qs.$orderby = "modificationDate desc";
            qs.$select = "shortid,name,creationDate,modificationDate,contentType";
            return "odata/images?" + $.param(qs);
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

        model: ImageModel
    });
});



