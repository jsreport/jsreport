define(["marionette", "core/dataGrid", "core/view.base"], function (Marionette, DataGrid, ViewBase) {
    return ViewBase.extend({
        template: "data-list",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                onShowDetail: function (id) {
                    window.location.hash = "extension/data/" + id;
                },
                el: $("#schemaGridBox"),
                headerTemplate: "data-list-header",
                rowsTemplate: "data-list-rows"
            });
        },
    });
}); 