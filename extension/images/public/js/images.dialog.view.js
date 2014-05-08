define(["marionette", "app", "jquery", "core/view.base"], function (Marionette, app, $, ViewBase) {
    return ViewBase.extend({
        template: "images-dialog",

        initialize: function() {
            this.listenTo(this.collection, "add", this.render);
        },

        events: {
            "click #saveCommand": "save",
        },

        onDomRefresh: function () {
            var self = this;

            self.Uploader = new $(self.$el.find('#fine-uploader')).fineUploader({
                element: self.$el.find('#fine-uploader'),
                request: {
                    endpoint: function() { return app.serverUrl + 'api/image'; },
                },
                text: {
                    uploadButton: '<button type="button" class="btn btn-xs btn-primary">Upload image</button>'
                },
                multiple: false,
                forceMultipart: true,
                autoUpload: true,
                validation: {
                    allowedExtensions: ['jpg', 'jpeg', 'JPG', 'JPEG', 'png', 'gif'],
                    acceptFiles: 'image/*',
                    sizeLimit: 2097152,
                },
            }).on("complete", function(event, id, filename, response) {
                self.collection.addImageRef($.extend(response, { name: filename, imageId: response._id }));
            });

        },
        
        getUrl: function(imgRef) {
            return window.location.protocol + "//" + window.location.host + "/api/image/" + imgRef.shortid;
        },

        save: function () {
            var self = this;
            this.collection.save({});
            this.trigger("dialog-close");
        }
    });
});