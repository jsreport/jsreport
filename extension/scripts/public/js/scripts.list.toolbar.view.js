define(["jquery", "app", "core/utils", "core/view.base", "underscore"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "scripts-list-toolbar",

            initialize: function() {
            },         
            
            events: {
                "click #deleteCommand": "deleteCommand"
            },

            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            }
        });
    });