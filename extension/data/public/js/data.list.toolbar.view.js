define(["jquery", "app", "codemirror", "core/utils", "core/view.base", "underscore"],
    function ($, app, CodeMirror, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-list-toolbar",
            
            initialize: function () {
            },
         
            
            events: {
                "click #deleteCommand": "deleteCommand",
            },
            
            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            }
        });
    });

