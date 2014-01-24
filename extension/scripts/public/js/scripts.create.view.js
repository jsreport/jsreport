define(["marionette", "app", "core/view.base"], function (Marionette, app, ViewBase) {
    return ViewBase.extend({
        template: "scripts-create",

        initialize: function () {
            var self = this;
        },

        events: {
            "click #saveCommand": "save"
        },

        save: function () {
            var self = this;
            this.model.set("name", this.$el.find("#name").val());
            this.model.save({}, {
                success: function () {
                    app.layout.dialog.hide();
                    app.scripts.trigger("created");
                }
            });
        }
    });
});