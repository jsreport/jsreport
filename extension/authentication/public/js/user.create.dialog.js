define(["app", "underscore", "marionette", "core/dataGrid", "core/view.base"], function (app, _, Marionette, DataGrid, ViewBase) {
    return ViewBase.extend({
        template: "user-create-dialog",

        initialize: function() {
            _.bindAll(this, "create", "validatePasswords");
        },

        events: {
            "click #okCommand": "create",
            "keyup [name='password']": "validatePasswords",
            "keyup [name='passwordVerification']": "validatePasswords"
        },

        validatePasswords: function() {
            var password = this.$el.find("[name='password']").val();
            var passwordVerification = this.$el.find("[name='passwordVerification']").val();

            if (password && passwordVerification &&
                password !== passwordVerification)
                this.$el.find("#passwordValidation").show();
            else
                this.$el.find("#passwordValidation").hide();
        },

        onValidate: function() {
            var res = [];

            if (this.model.get("username") == null || this.model.get("username") === "")
                res.push({
                    message: "Username cannot be empty"
                });

            if (this.model.get("password") == null || this.model.get("password") === "")
                res.push({
                    message: "Password cannot be empty"
                });

            if (this.model.get("password") !== this.model.get("passwordVerification"))
                res.push({
                    message: "Passwords do not match"
                });

            return res;
        },

        create: function() {
            if (!this.validate())
                return;

            var self = this;
            this.model.save({}, {
                success: function() {
                    app.layout.dialog.hide();
                    app.trigger("user-created", self.model);
                }
            });
        }
    });
});

