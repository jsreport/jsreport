/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "jquery", "backbone", "./template.model", "core/dataGrid"], function (app, $, Backbone, TemplateModel, DataGrid) {
    return Backbone.Collection.extend({

        url: function() {
            var qs =  this.filter.toOData();
            qs.$orderby = "modificationDate desc";
            return "odata/templates?" + $.param(qs);
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


        model: TemplateModel
    });
});

