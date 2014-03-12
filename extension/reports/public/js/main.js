
define('report.model',["app", "core/jaydataModel"], function (app, ModelBase) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.reports; },

        fetchQuery: function (cb) {
            return this.contextSet().find(this.get("_id"));
        },
        
        _initialize: function () {
            this.Entity = $entity.Report;
        },
    });
});


define('report.list.model',["backbone", "app", "report.model", "core/dataGrid"], function (Backbone, app, ReportModel, DataGrid) {
    return Backbone.Collection.extend({
        initialize: function () {
            var self = this;
            this.filter = new DataGrid.Filter.Base();
            this.filter.bind("apply", function () {
                self.fetch();
            });
        },
        
        parse: function (data) {
            if (data.totalCount != null)
                this.filter.set("totalCount", data.totalCount);

            return data;
        },

        fetchQuery: function () {
            return app.dataContext.reports
                .orderByDescending(function (t) { return t.creationDate; })
                .applyFilter(this.filter).toArray();
        },


        model: ReportModel,
    });
});


define('report.list.view',["marionette", "core/dataGrid", "jquery"], function (Marionette, DataGrid, $) {

    return Marionette.ItemView.extend({
        template: "report-list",

        initialize: function () {
            this.listenTo(this.collection, "sync", this.render);
            this.listenTo(this.collection, "remove", this.render);
        },

        onDomRefresh: function () {
            this.dataGrid = DataGrid.show({
                collection: this.collection,
                filter: this.collection.filter,
                idKey: "_id",
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


define('report.list.toolbar.view',["jquery", "app", "codemirror", "core/utils", "core/view.base", "underscore"],
    function ($, app, CodeMirror, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "report-list-toolbar",
            
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


define('report.detail.view',["core/view.base"], function(ViewBase) {
    return ViewBase.extend({
        template: "report-detail",

        initialize: function () {
            _.bindAll(this, "refresh");
            this.listenTo(this.model, "sync", this.refresh);
        },
        
        refresh: function() {
            
        }
    });
});

define('report.toolbar.view',["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "report-toolbar",
        });
    });
define('dashboard.reports.model',["app", "backbone", "report.model"], function (app, Backbone, ReportModel) {
    return Backbone.Collection.extend({
        fetchQuery: function(cb) {
            return app.dataContext.reports
                .orderByDescending(function (t) { return t.creationDate; })
                .take(4).toArray();
        },

        model: ReportModel,
    });
});

define('dashboard.reports.view',["marionette"], function (Marionette) {
    
    return Marionette.ItemView.extend({
        template: "dashboard-reports",
    
        events: {
            "click tr": "showDetail",
        },
    
        initialize: function() {
            this.listenTo(this.collection, "sync", this.render);
        },
    
        showDetail: function (ev, data) {
            var id = $(ev.target).closest("tr").attr("data-id");
            window.location.hash = "extension/reports/" + id;
        }
    });
});
define('report.templateToolbar.view',["app", "core/view.base", "core/utils", "jquery"], function(app, ViewBase, Utils, $) {
    return ViewBase.extend({
        tagName: "li",
        template: "report-template-toolbar",

        initialize: function() {
            _.bindAll(this, "renderReport");
        },
       
        events: {
           "click #renderCommand": "renderReport",
        },

        renderReport: function() {
            var self = this;
            app.trigger("toastr:info", "Report generation started ...");
            
            $.ajax({
                url: app.serverUrl + "api/report",
                type: 'POST',
                data: JSON.stringify({
                    template: self.templateView.getUIState(),
                    options: { saveResult: true }
                })
            })
                .then(function() {
                    app.trigger("toastr:info", "Report generation succefully finished.");
                })
                .fail(function(e) {
                    app.trigger("error", e);
                });
        },
    });
});
define(["app", "marionette", "backbone",
        "report.list.model", "report.list.view", "report.list.toolbar.view",
        "report.model", "report.detail.view", "report.toolbar.view",
        "dashboard.reports.model", "dashboard.reports.view", "report.templateToolbar.view"],
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
                    }), "reports");
                    model.fetch();
                });

                app.on("template-extensions-toolbar-render", function(context) {
                    var view = new TemplateToolbarView({ model: context.template });
                    view.templateView = context.view;
                    context.region.show(view, "render");
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