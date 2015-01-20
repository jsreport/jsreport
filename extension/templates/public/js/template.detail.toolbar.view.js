/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["jquery", "app", "marionette", "core/utils", "core/view.base", "underscore", "core/listenerCollection",
        "core/basicModel", "./template.preview"],
    function($, app, Marionette, Utils, LayoutBase, _, ListenerCollection, BasicModel, preview) {
        return LayoutBase.extend({
            template: "template-detail-toolbar",
            introTemplate: "template-detail-intro",
            introId: "template-detail-intro",

            initialize: function() {
                var self = this;

                $(document).on('keydown.template-detail', this.hotkey.bind(this));

                this.beforeRenderListeners = new ListenerCollection();
                this.listenTo(this.model, "sync", function() {
                    if (self.viewRendered)
                        return;

                    self.render();
                    self.viewRendered = true;

                    self.listenTo(self.contentView, "preview", function() {
                        self.preview();
                    });
                });

                this.listenTo(this, "render", function() {
                    var context = {
                        template: self.model,
                        extensionsRegion: self.extensionsRegion,
                        view: self
                    };
                    app.trigger("template-extensions-render", context);

                    var contextToolbar = {
                        name: "template-detail",
                        model: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self
                    };
                    app.trigger("toolbar-render", contextToolbar);
                });

                _.bindAll(this, "preview", "previewNewPanel", "onClose");
            },

            getRecipes: function() {
                return app.recipes;
            },

            getEngines: function() {
                return app.engines;
            },

            regions: {
                extensionsRegion: {
                    selector: "#extensionsBox",
                    regionType: Marionette.MultiRegion
                },
                extensionsToolbarRegion: {
                    selector: "#extensionsToolbarBox",
                    regionType: Marionette.MultiRegion
                }
            },

            events: {
                "click #saveCommand": "save",
                "click #previewCommand": "preview",
                "click #previewNewTabCommand": "previewNewPanel",
                "click #apiHelpCommnand": "apiHelp",
                "click #linkCommand": "link"
            },

            save: function(e) {
                var self = this;

                if (!this.validate())
                    return;

                this.model.save({}, {
                    success: function() {
                        app.trigger("template-saved", self.model);
                    }
                });
            },

            previewNewPanel: function() {
                this._preview("_blank");
                this.contentView.$el.find(".preview-loader").hide();
            },

            preview: function() {
                this._preview("previewFrame");
            },

            _preview: function(target) {
                preview(this.model, this.beforeRenderListeners, target);
            },

            onValidate: function() {
                var res = [];

                if (this.model.get("name") == null || this.model.get("name") === "")
                    res.push({
                        message: "Name cannot be empty"
                    });

                if (this.model.get("recipe") == null)
                    res.push({
                        message: "Recipe must be selected"
                    });

                return res;
            },

            apiHelp: function() {
                $.dialog({
                    header: "jsreport API",
                    content: $.render["template-detail-api"](this.model.toJSON(), this),
                    hideSubmit: true
                });

                var properties = {};
                properties.content = "...";
                properties.helpers = "...";
                properties.recipe = "..." ;

                this.model.trigger("api-overrides", function(key, value) {
                    value = value || "...";
                    properties[key] = _.isObject(value) ? value : "...";
                });

                var apiBox = ace.edit("apiBox");
                apiBox.setTheme("ace/theme/chrome");
                apiBox.getSession().setMode("ace/mode/json");
                apiBox.setOptions({
                    readOnly: true,
                    highlightActiveLine: false,
                    highlightGutterLine: false
                });
                apiBox.setValue(JSON.stringify({ template: properties }, null, 2));
            },

            link: function() {
                $.dialog({
                    header: "Link to template",
                    content: $.render["template-detail-link"](this.model.toJSON(), this),
                    hideSubmit: true
                });
            },

            hotkey: function(e) {
                if (e.ctrlKey && e.which === 83) {
                    this.save();
                    e.preventDefault();
                    return false;
                }

                if (e.which === 119) {
                    this.preview();
                    e.preventDefault();
                    return false;
                }
            },

            onClose: function() {
                $(document).off(".template-detail");
            }
        });
    });