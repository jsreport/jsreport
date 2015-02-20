﻿define(["jquery", "app", "marionette", "backbone",
        "./images.list.view",  "./images.list.toolbar.view", "./images.list.model",
        "./images.toolbar.view", "./images.detail.view", "./images.model", "./images.uploader"],
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
        });
    });