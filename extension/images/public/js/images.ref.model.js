define(["app", "Backbone", "core/dataGrid"], function (app, Backbone, DataGrid) {

    var ImageRefModel = Backbone.Model.extend({
    });

    return Backbone.Collection.extend({
        initialize: function () {
            var self = this;
        },
        
        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
            
            if (templateModel.get("images") != null) {
                this.add(templateModel.get("images").map(function(m) {
                    return m;
                }));
            }
        },
        
        fetch: function(opt) {
            opt.success();
        },
        
        addImageRef: function (imageRef) {
            this.add(imageRef);
        },
        
        save: function (opt) {
            this.templateModel.set("images", this.toJSON().map(function(m) {
                return new $entity.ImageRef({
                    name: m.name,
                    shortid: m.shortid,
                    imageId: m.imageId
                });
            }));
        },

        model: ImageRefModel
    });
});

