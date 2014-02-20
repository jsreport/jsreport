define(["app", "marionette", "backbone",
        "./report.list.model", "./report.list.view", "./report.list.toolbar.view",
        "./report.model", "./report.detail.view", "./report.toolbar.view",
        "./dashboard.reports.model", "./dashboard.reports.view", "./report.templateToolbar.view"],
    function(app, Marionette, Backbone, ReportListModel, ReportListView, ReportListToolbarView, ReportModel, ReportDetailView, ReportToolbarView,
        DashboardModel, DashboardView, TemplateToolbarView) {
        app.module("report", function(module) {
            var Router = Backbone.Router.extend({
                routes: {
                    "extension/reports": "report",
                    "extension/reports/:id": "reportDetail",
                },

                report: function() {
                    this.navigate("/extension/reports");

                    var model = new ReportListModel();

                    app.layout.showToolbarViewComposition(new ReportListView({ collection: model }), new ReportListToolbarView({ collection: model }));

                    model.fetch();
                },

                reportDetail: function(id) {
                    var model = new ReportModel();
                    model.set("_id", id);
                    model.fetch({
                        success: function() {
                            app.layout.showToolbarViewComposition(new ReportDetailView({ model: model }), new ReportToolbarView({ model: model }));}
                    });
                },
            });

            app.report.router = new Router();

            if (!app.settings.playgroundMode) {

                app.on("menu-render", function(context) {
                    context.result += "<li><a href='#/extension/reports'>Reports</a></li>";
                });

                app.on("dashboard-extensions-render", function(region) {
                    var model = new DashboardModel();
                    region.show(new DashboardView({
                        collection: model
                    }));
                    model.fetch();
                });

                app.on("template-extensions-toolbar-render", function(context) {
                    var view = new TemplateToolbarView({ model: context.template });
                    view.templateView = context.view;
                    context.region.show(view);
                });
            }

            app.on("entity-registration", function(context) {
                $entity.Template.addMember("reports", { type: Array, elementType: "$entity.Report", inverseProperty: "template" });

                $data.Entity.extend('$entity.Report', {
                    '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
                    'creationDate': { 'type': 'Edm.DateTime' },
                    'name': { 'type': 'Edm.String' },
                    'fileExtension': { 'type': 'Edm.String' },
                    'contentType': { 'type': 'Edm.String' },
                    'templateShortid': { 'type': 'Edm.String' }
                });

                $entity.Report.prototype.toString = function() {
                    return "Report " + (this.name || "");
                };

                context["reports"] = { type: $data.EntitySet, elementType: $entity.Report };
            });


        });
    });