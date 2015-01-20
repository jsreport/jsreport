define(["jquery", "app", "core/utils", "core/view.base", "underscore"],
    function ($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "user-list-toolbar",

            initialize: function () {
            },


            events: {
                "click #deleteCommand": "deleteCommand",
                "click #createCommand": "createCommand"

            },

            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            },

            createCommand: function() {
                app.trigger("create-user");
            }
        });
    });

