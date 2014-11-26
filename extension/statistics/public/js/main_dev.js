/* globals $entity */

define(["app", "marionette", "backbone",
        "./dashboard.statistics.model", "./dashboard.statistics.view"],
    function (app, Marionette, Backbone, DashboardModel, DashboardView) {
            app.on("dashboard-extensions-render", function (region) {
                var model = new DashboardModel();
                region.show(new DashboardView({
                    model: model
                }), "stats");
                model.fetch();
            });

            app.on("entity-registration", function (context) {

                $data.Entity.extend('$entity.Statistic', {
                    '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
                    'fiveMinuteDate': { 'type': 'Edm.DateTime' },
                    'amount': { 'type': 'Edm.Int32' },
                    'success': { 'type': 'Edm.Int32' }
                });

                context["statistics"] = { type: $data.EntitySet, elementType: $entity.Statistic };
            });
    });