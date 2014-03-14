define(["jquery", "app", "codemirror", "core/utils", "core/view.base", "underscore"],
    function ($, app, CodeMirror, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "images-list-toolbar",
            
            initialize: function () {
            },
            
            events: {
                "click #deleteCommand": "deleteCommand",
                "click #uploadCommand": "uploadCommand",
            },
            
            deleteCommand: function() {
                this.contentView.dataGrid.deleteItems();
            },
            
            uploadCommand: function() {
                $("#uploadImage").click();
            }
        });
    });

