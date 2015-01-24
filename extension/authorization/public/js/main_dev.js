define(["app", "underscore", "marionette", "backbone", "./permissions.toolbar.view"],
    function (app, _,  Marionette, Backbone, PermissionsToolbarView) {

        if (!app.authentication)
            return;

        app.module("authorization", function (module) {
            app.on("after-entity-registration", function(context) {
                for(var key in context) {
                    context[key].elementType.addMember("readPermissions", { type: "Array", elementType: "id" });
                    context[key].elementType.addMember("editPermissions", { type: "Array", elementType: "id" });
                }
            });

            app.on("toolbar-render", function (context) {
                var view = new PermissionsToolbarView({ model: context.model });
                context.region.show(view, "permissions");
            });
        });
    });