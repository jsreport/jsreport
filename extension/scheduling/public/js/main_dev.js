define(["app", "marionette", "backbone",
        "./scheduling.list.model", "./scheduling.list.view", "./scheduling.list.toolbar.view",
        "./scheduling.model", "./scheduling.detail.view",
        "./scheduling.toolbar.view"],
    function (app, Marionette, Backbone, ListModel, ListView, ListToolbarView, Model, DetailView,
              ToolbarView) {

        app.module("scheduling", function (module) {
            var Router = Backbone.Router.extend({
                initialize: function () {
                    app.listenTo(app, "schedule-saved", function (model) {
                        window.location.hash = "/extension/scheduling/detail/" + model.get("shortid");
                    });
                },

                routes: {
                    "extension/scheduling/list": "scheduling",
                    "extension/scheduling/detail/:id": "schedulingDetail",
                    "extension/scheduling/detail": "schedulingDetail"
                },

                scheduling: function () {
                    this.navigate("/extension/scheduling/list");

                    var model = new ListModel();
                    app.layout.showToolbarViewComposition(new ListView({ collection: model }), new ListToolbarView({ collection: model }));
                    model.fetch();
                },

                schedulingDetail: function (id) {
                    var model = new Model();

                    if (id != null) {
                        model.set("shortid", id);
                    }

                    model.fetch({
                        success: function () {
                            app.layout.showToolbarViewComposition(new DetailView({model: model}), new ToolbarView({model: model}));
                        }
                    });
                }
            });

            app.scheduling.on("created", function () {
                app.data.router.scheduling();
            });

            app.scheduling.router = new Router();

            app.on("menu-render", function (context) {
                if (!app.settings.tenant || app.settings.tenant.isAdmin)
                    context.result += "<li><a href='/#/extension/scheduling/list'>Scheduling</a></li>";
            });

            app.on("menu-actions-render", function (context) {
                if (!app.settings.tenant || app.settings.tenant.isAdmin)
                    context.result += "<li><a id='createScheduleCommand' href='#/extension/scheduling/detail' class='validate-leaving'>Create Schedule</a></li>";
            });
        });
    });