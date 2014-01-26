define(["marionette", "core/dataGrid", "jquery"], function (Marionette, DataGrid, $) {

    return Marionette.ItemView.extend({
        template: "report-list",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "shortid",
                onShowDetail: function (id) {
                    window.location.hash = "/extension/reports/" + id;
                },
                el: $("#reportGridBox"),
                headerTemplate: "report-list-header",
                rowsTemplate: "report-list-rows"
            });
        },
    });
});

