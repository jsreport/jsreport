define(["marionette", "core/view.base", "underscore", "core/dataGrid", "jquery", "app"], function(Marionette, ViewBase, _, DataGrid, $, app) {
    return ViewBase.extend({
        template: "scheduling-detail",

        initialize: function() {
            var self = this;
            _.bindAll(this, "getTemplates");
            this.listenTo(this.model, "sync", this.render);
        },

        getTemplates: function () {
            return this.model.templates;
        },

        validateLeaving: function() {
            return !this.model.hasChangesSyncLastSync();
        },

        onDomRefresh: function () {
            var self = this;
            this.dataGrid = DataGrid.show({
                collection: this.model.tasks,
                filter: this.model.tasks.filter,
                idKey: "_id",
                el: $("#tasksGridBox"),
                headerTemplate: "scheduling-tasks-header",
                rowsTemplate: "scheduling-tasks-rows",
                showSelection: false,
                onRender: function() {
                    self.$el.find(".reportDownload").click(function() {
                        if ($(this).attr("data-error")) {
                            $.dialog({
                                header: "Error",
                                content: $(this).attr("data-error"),
                                hideSubmit: true,
                                error: true
                            });
                            return;
                        }
                        var taskId = $(this).attr("data-id");
                        app.dataContext.reports.single(function(r) { return r.taskId === this.id; }, { id : taskId}).then(function(report) {
                            window.open(app.serverUrl + "reports/" + report._id + "/content", "_blank");
                        });
                    });
                }
            });
        }
    });
});