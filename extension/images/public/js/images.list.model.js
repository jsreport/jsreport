define(["app", "backbone", "core/dataGrid", "./images.model"], function (app, Backbone, DataGrid, ImageModel) {
    
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
            return app.dataContext.images.map(function(i) {
                 return { shortid: i.shortid, _id: i._id, name: i.name, creationDate: i.creationDate, modificationDate: i.modificationDate };
            }).applyFilter(this.filter).toArray();
        },

        model: ImageModel
    });
});



