define(["app", "underscore", "core/view.base", "./permissions.dialog", "./permissions.model"],
    function (app, _, ViewBase, PermissionsDialog, PermissionsModel) {

       return ViewBase.extend({
            tagName: "li",
            template: "template-permissions",

            initialize: function () {
                _.bindAll(this, "permissions");
            },

            events: {
                "click #permissionsCommand": "permissions"
            },

            permissions: function () {
                var model = new PermissionsModel();

                model.entityModel = this.model;
                var dialog = new PermissionsDialog({model: model});

                model.fetch({
                    success: function () {
                        app.layout.dialog.show(dialog);
                    }
                });
            }
        });
    });
