define(["jquery", "app", "marionette", "core/utils", "core/view.base"],
    function($, app, Marionette, Utils, LayoutBase) {
        return LayoutBase.extend({
            template: "scripts-toolbar",

            initialize: function() {
                $(document).on('keydown.script-detail', this.hotkey.bind(this));

                var self = this;
                this.listenTo(this, "render", function() {
                    var contextToolbar = {
                        name: "script-detail",
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
                        app.trigger("script-saved", self.model);
                    }
                });
            },

            onDomRefresh: function() {
                var self = this;
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
                 

                return res;
            },

            onClose: function() {
                $(document).off(".script-detail");
            }
        });
    });