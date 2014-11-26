define(["marionette", "core/dataGrid", "core/view.base"], function (Marionette, DataGrid, ViewBase) {
    return ViewBase.extend({
        template: "scripts-list",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            this.dataGrid = DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "shortid",
                onShowDetail: function (id) {
                    window.location.hash = "extension/scripts/detail/" + id;
                },
                el: $("#scriptsGridBox"),
                headerTemplate: "scripts-list-header",
                rowsTemplate: "scripts-list-rows"
            });
        }
    });
}); 