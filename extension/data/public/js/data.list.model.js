define(["app", "backbone", "core/dataGrid", "./data.model"], function (app, Backbone, DataGrid, DataModel) {
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
            return app.dataContext.data.applyFilter(this.filter).toArray();
        },

        model: DataModel
    });
});



