/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "./template.model", "core/dataGrid"], function (app, TemplateModel, DataGrid) {
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
            return app.dataContext.templates
                .orderByDescending(function(t) {
                    return t.modificationDate;
                })
                .applyFilter(this.filter).toArray();
        },

        model: TemplateModel
    });
});

