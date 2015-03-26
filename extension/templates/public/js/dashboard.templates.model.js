/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["backbone", "app", "./template.model"], function (Backbone, app, TemplateModel) {
    return Backbone.Collection.extend({
        url: function() {
            return "odata/templates?$top=4&$orderby=modificationDate desc"
        },

        model: TemplateModel
    });
});

