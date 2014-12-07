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
            if (data.totalCount != null)
                this.filter.set("totalCount", data.totalCount);

            return data;
        },

        fetchQuery: function () {
            return app.dataContext.tasks
                .filter(function(t) { return t.scheduleShortid === this.scheduleShortid; }, { scheduleShortid : this.scheduleShortid})
                .orderByDescending(function(t) {
                    return t.finishDate;
                })
                .applyFilter(this.filter).toArray();
        },

        model: Model
    });
});



