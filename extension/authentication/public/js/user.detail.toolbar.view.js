define(["jquery", "app", "marionette", "core/utils", "core/view.base", "./user.changePassword.dialog"],
    function($, app, Marionette, Utils, LayoutBase, ChangePasswordDialog) {
        return LayoutBase.extend({
            template: "user-detail-toolbar",

            events: {
                "click #saveCommand": "save",
                "click #changePasswordCommand": "change"

            },

            initialize: function() {
                var self = this;
                this.listenTo(this.model, "change", function() {
                    self.render();
                });
                this.listenTo(this, "render", function() {
                    var contextToolbar = {
                        name: "user-detail",
                        model: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("toolbar-render", contextToolbar);
                });
            },

            regions: {
                extensionsToolbarRegion: {
                    selector: "#extensionsToolbarBox",
                    regionType: Marionette.MultiRegion
                }
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