define(["marionette", "jquery", "app", "core/utils", "core/view.base"],
    function(Marionette, $, app, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "data-toolbar",

            initialize: function() {
                var self = this;
                $(document).on('keydown.data-detail', this.hotkey.bind(this));

                this.listenTo(this, "render", function() {
                    var contextToolbar = {
                        name: "data-detail",
                        model: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("toolbar-render", contextToolbar);
                });
            },

            events: {
                "click #saveCommand": "save"
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

                if (this.model.get("name") == null || this.model.get("name") === "")
                    res.push({
                        message: "Name cannot be empty"
                    });

                try {
                    var json = JSON.parse(this.model.get("dataJson"));
                } catch(e) {
                    res.push({
                        message: "Data must be valid JSON. e.g. { \"propertName\": \"propertyValue\"} <br/>" + e.toString()
                    });
                }

                return res;
            },

            onClose: function() {
                $(document).off(".data-detail");
            }
        });
    });