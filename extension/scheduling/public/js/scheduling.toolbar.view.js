define(["jquery", "app", "core/utils", "core/view.base"],
    function ($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "scheduling-toolbar",

            initialize: function () {
                $(document).on('keydown.data-detail', this.hotkey.bind(this));
            },

            events: {
                "click #saveCommand": "save"
            },

            save: function () {
                if (!this.validate())
                    return;

                var self = this;
                this.model.save({}, {
                    success: function () {
                        app.trigger("schedule-saved", self.model);
                        self.model.fetch({
                            success: function () {
                                self.contentView.render();
                            }
                        });
                    },
                    error: function(m, e) {
                        e.handled = true;
                        $.dialog({
                            header: "Error",
                            content: "Saving Schedule failed. Maybe you have wrong cron syntax.",
                            hideSubmit: true,
                            error: true
                        });
                    }
                });
            },

            hotkey: function (e) {
                if (e.ctrlKey && e.which === 83) {
                    this.save();
                    e.preventDefault();
                    return false;
                }
            },

            onValidate: function () {
                var res = [];

                if (!this.model.get("name"))
                    res.push({
                        message: "Name cannot be empty"
                    });

                if (!this.model.get("cron"))
                    res.push({
                        message: "Cron cannot be empty"
                    });

                if (!this.model.get("templateShortid"))
                    res.push({
                        message: "Choose a template"
                    });

                return res;
            },

            onClose: function () {
                $(document).off(".schedule-detail");
            }
        });
    });