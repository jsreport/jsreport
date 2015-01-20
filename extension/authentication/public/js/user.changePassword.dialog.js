define(["app", "underscore", "marionette", "core/dataGrid", "core/view.base", "core/basicModel"], function (app, _, Marionette, DataGrid, ViewBase, ModelBase) {

    var ChangePasswordCommand = ModelBase.extend({
        url: function() {
            return "users/" + this.get("shortid") + "/password";
        }
    });

    return ViewBase.extend({
        template: "user-changePassword-dialog",

        initialize: function() {
            var self = this;
            _.bindAll(this, "change", "validatePasswords");
        },

        events: {
            "click #okCommand": "change",
            "keyup [name='newPassword']": "validatePasswords",
            "keyup [name='newPasswordVerification']": "validatePasswords"
        },

        validatePasswords: function() {
            var password = this.$el.find("[name='newPassword']").val();
            var passwordVerification = this.$el.find("[name='newPasswordVerification']").val();

            if (password && passwordVerification &&
                password !== passwordVerification)
                this.$el.find("#passwordValidation").show();
            else
                this.$el.find("#passwordValidation").hide();
        },

        onValidate: function() {
            var res = [];

            if (this.model.get("newPassword") == null || this.model.get("newPassword") === "")
                res.push({
                    message: "Password cannot be empty"
                });

            if (this.model.get("newPassword") !== this.model.get("newPasswordVerification"))
                res.push({
                    message: "Passwords do not match"
                });

            return res;
        },


        change: function() {
            var self = this;
            var command = new ChangePasswordCommand({
                shortid: this.model.get("shortid"),
                oldPassword: this.model.get("oldPassword"),
                newPassword: this.model.get("newPassword")
            });

            command.save({}, {
                success: function() {
                    self.model.set("oldPassword", "");
                    self.model.set("newPassword", "");
                    self.model.set("newPasswordVerification", "");
                    app.layout.dialog.hide();
                }
            });
        }
    });
});

