/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["marionette", "core/dataGrid", "jquery", "toastr"], function (Marionette, DataGrid, $, toastr) {

    return Marionette.ItemView.extend({
        template: "template-list",

        initialize: function() {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            this.dataGrid = DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "shortid",
                onShowDetail: function(id) {
                    window.location.hash = "extension/templates/" + id;
                },
                el: $("#templateGridBox"),
                headerTemplate: "template-list-header",
                rowsTemplate: "template-list-rows"
            });
        }
    });
});