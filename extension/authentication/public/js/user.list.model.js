define(["app", "backbone", "core/dataGrid", "./user.model"], function (app, Backbone, DataGrid, UserModel) {
    return Backbone.Collection.extend({

        url: function() {
            var qs =  this.filter.toOData();
            return "odata/users?" + $.param(qs);
        },

        initialize: function () {
            var self = this;
            this.filter = new DataGrid.Filter.Base({ searchProperty: "username"});
            this.filter.bind("apply", function () {
                self.fetch();
            });
        },

        parse: function (data) {
            if (this.meta && this.meta["@odata.count"])
                this.filter.set("totalCount", this.meta["@odata.count"]);

            return data;
        },

        model: UserModel
    });
});



