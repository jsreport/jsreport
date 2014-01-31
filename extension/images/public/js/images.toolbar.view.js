define(["jquery", "app", "core/utils", "core/view.base", "./images.uploader"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "images-toolbar",

            events: {
                "click #saveCommand": "save",
                "click #embedCommand": "embed",
            },

            onDomRefresh: function() {
                var self = this;

                this.uploader = $(this.$el).find('#fine-uploader').imageUploader({
                    complete: function(response) {
                        self.model.set("name", response.name);
                    },
                    getId: function() {
                        return self.model.get("shortid");
                    }
                });
            },

            upload: function() {
                this.uploader.open();
            },

            embed: function() {
                  $.dialog({
                        header: "Insert image into template",
                        content: "To insert this image into template. Paste following code: <br><br> <code style='border: 1px'>&lt;img src='/image/name/" + this.model.get("name") + "'/&gt;</code>",
                        hideSubmit: true
                    });
            },
        });
    });