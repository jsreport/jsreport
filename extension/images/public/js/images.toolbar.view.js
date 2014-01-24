define(["jquery", "app", "core/utils", "core/view.base", "./images.uploader"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "images-toolbar",

            events: {
                "click #saveCommand": "save",
                "click #uploadCommand": "upload",
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

            save: function() {
                this.model.save();
            },
        });
    });