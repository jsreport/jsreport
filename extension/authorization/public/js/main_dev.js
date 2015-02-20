define(["app", "underscore", "marionette", "backbone", "./permissions.toolbar.view"],
    function (app, _,  Marionette, Backbone, PermissionsToolbarView) {

        if (!app.authentication)
            return;

        app.module("authorization", function (module) {
            app.on("toolbar-render", function (context) {
                var view = new PermissionsToolbarView({ model: context.model });
                context.region.show(view, "permissions");
            });
        });
    });