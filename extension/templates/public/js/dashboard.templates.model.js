/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["backbone", "app", "./template.model"], function (Backbone, app, TemplateModel) {
    return Backbone.Collection.extend({
        fetchQuery: function () {
            return app.dataContext.templates
                    .orderByDescending(function (t) {
                        return t.modificationDate;
                    })
                    .take(4).toArray();
        },
        model: TemplateModel
    });
});

