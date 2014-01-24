define(["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-toolbar",

            events: {
                "click #saveCommand": "save",
            },

            save: function() {
                this.model.save();
            },
        });
    });