define(["jquery", "app"],
    function($, app) {

        $.fn.imageUploader = function(options) {
            var self = this;

            if (this.length === 0)
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