define(["jquery", "app", "marionette", "backbone",
        "./images.template.view", "./images.list.view",  "./images.list.toolbar.view", "./images.list.model",
        "./images.toolbar.view", "./images.detail.view", "./images.model", "./images.uploader"],
    function($, app, Marionette, Backbone, TemplateView, ImagesListView, ImagesListToolbarView, ImagesListModel,
        ImageToolbarView, ImageDetailView, ImageModel) {

        app.module("images", function(module) {
            var Router = Backbone.Router.extend({
                routes: {
                    "extension/images": "images",
                    "extension/images/:id": "detail",
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
                    model.set("_id", id);

                    app.layout.showToolbarViewComposition(new ImageDetailView({ model: model }), new ImageToolbarView({ model: model }));

                    model.fetch();
                },
            });

            app.images.router = new Router();

            app.on("menu-actions-render", function(context) {
                context.result += "<li><a id='uploadImage'>Upload Image</a><span style='display:none' id='actionImageUploader' /></li>";
                context.on("after-render", function($el) {
                    var uploader = $($el).find('#actionImageUploader').imageUploader({
                        complete: function(response) {
                            app.images.router.detail(response._id);
                        },
                    });

                    $($el).find("#uploadImage").click(function() {
                         uploader.open();
                    });
                });
            });

            if (app.settings.mode == "playground") {
                app.on("template-extensions-render", function(context) {
                    var view = new TemplateView();
                    view.setTemplateModel(context.template);
                    context.extensionsRegion.show(view);
                });
            }

            if (!app.settings.playgroundMode) {
                app.on("menu-render", function(context) {
                    context.result += "<li><a href='#/extension/images'>Images</a></li>";
                });
            }

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
                    "modificationDate": { type: "date" },
                }, null);

                $entity.Image.prototype.toString = function() {
                    return "Image " + (this.name || "");
                };

                context["images"] = { type: $data.EntitySet, elementType: $entity.Image };
            });
        });
    });