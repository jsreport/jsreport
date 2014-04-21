define(["jquery", "app", "core/utils", "core/view.base"],
    function($, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-toolbar",

            initialize: function() {
                $(document).on('keydown', this.hotkey.bind(this));
            },

            events: {
                "click #saveCommand": "save",
            },

            save: function() {
                if (!this.validate())
                    return;

                var self = this;
                this.model.save({}, {
                    success: function() {
                        app.trigger("data-saved", self.model);
                    }
                });
            },

            hotkey: function(e) {
                if (e.ctrlKey && e.which === 83) {
                    this.save();
                    e.preventDefault();
                    return false;
                }
            },

            onValidate: function() {
                var res = [];

                if (this.model.get("name") == null || this.model.get("name") == "")
                    res.push({
                        message: "Name cannot be empty"
                    });

                try {
                    var json = JSON.parse(this.model.get("dataJson"));
                } catch(e) {
                    res.push({
                        message: "Data must be valid JSON. " + e.toString()
                    });
                }

                return res;
            },

            onClose: function() {
                $(document).off("keydown", this.hotkey);
            }
        });
    });