define(["app", "underscore", "core/view.base"],
    function (app, _, ViewBase) {

        return ViewBase.extend({
            template: "template-permissions-dialog",

            initialize: function () {
                _.bindAll(this, "save", "getUsers");
            },

            events: {
                "click #okCommand": "save"
            },

            save: function () {
                this.model.save({
                    success: function () {
                        app.layout.dialog.hide();
                    }
                });
            },

            getUsers: function () {
                return this.model.users;
            },

            onDomRefresh: function () {
                this.$el.find('#readPermissions').multiselect();
                this.$el.find('#editPermissions').multiselect();
            }
        });
    });