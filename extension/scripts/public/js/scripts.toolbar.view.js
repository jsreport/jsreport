define(["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "scripts-toolbar",

            events: {
                "click #saveCommand": "save",
            },

            save: function() {
                var self = this;
                this.model.save({}, {
                    success: function() {
                        app.trigger("script-saved", self.model);
                    }
                });
            },

            onDomRefresh: function() {
                var self = this;

                this.$el.find("#editableBox").hover(function() {
                    self.$el.find("#nameInput").show();
                    self.$el.find("#name").hide();
                }, function() {
                    self.$el.find("#nameInput").hide();
                    self.$el.find("#name").html(self.$el.find("#nameInput").val());
                    self.$el.find("#name").show();
                });
            },
        });
    });