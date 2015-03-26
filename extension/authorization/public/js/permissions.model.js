define(["app", "underscore", "core/basicModel"],
    function (app, _, ModelBase) {

        return ModelBase.extend({
            initialize: function() {
                this.usersModel = new app.authentication.UsersListModel();
            },

            fetch: function(options) {
                var self = this;

                if (!self.entityModel.get("readPermissions"))
                    self.entityModel.set("readPermissions", []);
                if (!self.entityModel.get("editPermissions"))
                    self.entityModel.set("editPermissions", []);

                self.set("readPermissions", self.entityModel.get("readPermissions"));
                self.set("editPermissions", self.entityModel.get("editPermissions"));

                this.usersModel.fetch({
                    success: function() {
                        self.users = self.usersModel.toJSON();
                        options.success();
                    }
                });
            },

            save: function(options) {
                this.entityModel.set("editPermissions", this.get("editPermissions"));
                this.entityModel.set("readPermissions", this.get("readPermissions"));
                var self = this;

                this.entityModel.save({}, {
                    success: function() {
                        self.entityModel.fetch(options);
                    }
                });
            }
        });
    });