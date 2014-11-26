define(["app", "backbone", "core/dataGrid", "./scripts.model"], function (app, Backbone, DataGrid, ScriptModel) {
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
            return app.dataContext.scripts.applyFilter(this.filter).toArray();
        },

        model: ScriptModel
    });
});



