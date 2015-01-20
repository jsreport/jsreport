define(["jquery", "app", "marionette", "core/utils", "core/view.base", "./images.uploader"],
    function($, app, Marionette, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "images-toolbar",

            initialize: function() {
                var self = this;

                this.listenTo(this, "render", function() {
                    var contextToolbar = {
                        name: "image-detail",
                        model: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("toolbar-render", contextToolbar);
                });
            },

            events: {
                "click #saveCommand": "save",
                "click #embedCommand": "embed",
                "click #uploadCommand": "upload"
            },

            regions: {
                extensionsToolbarRegion: {
                    selector: "#extensionsToolbarBox",
                    regionType: Marionette.MultiRegion
                }
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
            }
        });
    });