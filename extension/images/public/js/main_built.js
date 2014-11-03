define('images.list.view',["marionette", "core/dataGrid", "core/view.base"], function (Marionette, DataGrid, ViewBase) {
    return ViewBase.extend({
        template: "images-list",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            this.dataGrid = DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "shortid",
                onShowDetail: function (id) {
                    window.location.hash = "extension/images/" + id;
                },
                el: $("#imagesGridBox"),
                headerTemplate: "images-list-header",
                rowsTemplate: "images-list-rows"
            });
        },
    });
}); 
define('images.list.toolbar.view',["jquery", "app", "core/utils", "core/view.base", "underscore"],
    function ($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "images-list-toolbar",
            
            initialize: function () {
            },
            
            events: {
                "click #deleteCommand": "deleteCommand",
                "click #uploadCommand": "uploadCommand",
            },
            
            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            },
            
            uploadCommand: function() {
                $("#uploadImage").click();
            }
        });
    });


define('images.model',["app", "backbone", "core/jaydataModel"], function (app, Backbone, ModelBase) {
    
    return ModelBase.extend({
        contextSet: function() { return app.dataContext.images; },
        
        fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid == this.id; }, { id: this.get("shortid") });
        },

        _initialize: function() {
            var self = this;
            this.Entity = $entity.Image;
        },
    });
});
define('images.list.model',["app", "backbone", "core/dataGrid", "images.model"], function (app, Backbone, DataGrid, ImageModel) {
    
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

        model: ImageModel,
    });
});




define('images.uploader',["jquery", "app"],
    function($, app) {

        $.fn.imageUploader = function(options) {
            var self = this;

            if (this.length == 0)
                return this;

            var uploader = new $(this).fineUploader({
                element: this,
                request: {
                    endpoint: function() {
                        return app.serverUrl + 'api/image/' + (options.getId != null ? options.getId() : "");
                    }
                },
                multiple: false,
                forceMultipart: true,
                autoUpload: true,
                validation: {
                    allowedExtensions: ['jpg', 'jpeg', 'JPG', 'JPEG', 'png', 'gif'],
                    acceptFiles: 'image/*',
                    sizeLimit: 2097152
                }
            }).on("complete", function(event, id, filename, response) {
                options.complete(response);
            });

            return $.extend(uploader, {
                open: function() {
                    self.find('input[type=file]').trigger('click');
                }
            });
        };

        $.extend({
            imageUploader: $.fn.imageUploader
        });
    });
define('images.toolbar.view',["jquery", "app", "core/utils", "core/view.base", "images.uploader"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "images-toolbar",

            events: {
                "click #saveCommand": "save",
                "click #embedCommand": "embed",
                "click #uploadCommand": "upload",
            },

            onDomRefresh: function() {
                var self = this;

                this.uploader = $(this.$el).find('#fine-uploader').imageUploader({
                    complete: function(response) {
                        self.model.set("name", response._id);
                    },
                    getId: function() {
                        return self.model.get("shortid");
                    }
                });
            },

            save: function() {
                this.model.save();
            },

            upload: function() {
                this.uploader.open();
            },

            embed: function() {
                  $.dialog({
                        header: "Insert image into template",
                        content: $.render["images-embed-info"](this.model.toJSON()),
                        hideSubmit: true
                    });
            },
        });
    });
define('images.detail.view',["marionette", "core/view.base",], function (Marionette, ViewBase) {

    return ViewBase.extend({
        template: "images-detail",

        initialize: function () {
            var self = this;
            this.listenTo(this.model, "sync", this.render);
            this.listenTo(this.model, "change", this.render);
        },
    });
});


define(["jquery", "app", "marionette", "backbone",
        "images.list.view",  "images.list.toolbar.view", "images.list.model",
        "images.toolbar.view", "images.detail.view", "images.model", "images.uploader"],
    function($, app, Marionette, Backbone, ImagesListView, ImagesListToolbarView, ImagesListModel,
        ImageToolbarView, ImageDetailView, ImageModel) {

        app.module("images", function(module) {
            var Router = Backbone.Router.extend({
                routes: {
                    "extension/images": "images",
                    "extension/images/:id": "detail"
                },

                images: function() {
                    this.navigate("/extension/images");

                    var model = new ImagesListModel();
                    
                    app.layout.showToolbarViewComposition(new ImagesListView({ collection: model }), new ImagesListToolbarView({ collection: model }));

                    model.fetch();
                },

                detail: function(id) {
                    this.navigate("/extension/images/" + id);
                    var model = new ImageModel();
                    model.set("shortid", id);

                    app.layout.showToolbarViewComposition(new ImageDetailView({ model: model }), new ImageToolbarView({ model: model }));

                    model.fetch();
                }
            });

            app.images.router = new Router();

            app.on("menu-actions-render", function(context) {
                context.result += "<li><a id='uploadImage'>Upload Image</a><span style='display:none' id='actionImageUploader' /></li>";
                context.on("after-render", function($el) {
                    var uploader = $($el).find('#actionImageUploader').imageUploader({
                        complete: function(response) {
                            app.images.router.detail(response.shortid);
                        }
                    });

                    $($el).find("#uploadImage").click(function() {
                         uploader.open();
                    });
                });
            });

            app.on("menu-render", function(context) {
                    context.result += "<li><a href='#/extension/images'>Images</a></li>";
            });

            app.on("entity-registration", function(context) {

                $data.Class.define("$entity.ImageRef", $data.Entity, null, {
                    "name": { 'type': 'Edm.String' },
                    "shortid": { 'type': 'Edm.String' },
                    "imageId": { 'type': 'Edm.String' }
                }, null);

                $entity.Template.addMember("images", { type: "Array", elementType: "$entity.ImageRef" });

                $data.Class.define("$entity.Image", $data.Entity, null, {
                    '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
                    "shortid": { 'type': 'Edm.String' },
                    "name": { 'type': 'Edm.String' },
                    "creationDate": { type: "date" },
                    "modificationDate": { type: "date" }
                }, null);

                $entity.Image.prototype.toString = function() {
                    return "Image " + (this.name || "");
                };

                context["images"] = { type: $data.EntitySet, elementType: $entity.Image };
            });
        });
    });
