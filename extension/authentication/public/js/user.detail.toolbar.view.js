define(["jquery", "app", "core/utils", "core/view.base", "./user.changePassword.dialog"],
    function($, app, Utils, LayoutBase, ChangePasswordDialog) {
        return LayoutBase.extend({
            template: "user-detail-toolbar",

            events: {
                "click #saveCommand": "save",
                "click #changePasswordCommand": "change"

            },

            save: function() {
                if (!this.validate())
                    return;

                var self = this;
                this.model.save({}, {
                    success: function() {
                        app.trigger("user-saved", self.model);
                    }
                });
            },

            change: function() {
                var dialog = new ChangePasswordDialog({ model: this.model });
                app.layout.dialog.show(dialog);
            },

            onValidate: function() {
                var res = [];

                if (this.model.get("username") == null || this.model.get("username") === "")
                    res.push({
                        message: "Username cannot be empty"
                    });

                return res;
            }
        });
    });