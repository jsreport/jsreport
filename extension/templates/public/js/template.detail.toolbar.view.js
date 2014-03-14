/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["jquery", "app", "codemirror", "core/utils", "core/view.base", "core/codeMirrorBinder", "underscore", "core/listenerCollection",
        "./template.embed.dialog", "core/basicModel"],
    function($, app, CodeMirror, Utils, LayoutBase, binder, _, ListenerCollection, EmbedDialog, BasicModel) {
        return LayoutBase.extend({
            template: "template-detail-toolbar",

            initialize: function() {
                var self = this;

                this.beforeRenderListeners = new ListenerCollection();

                this.listenTo(this.model, "sync", function() {
                    self.render();

                    self.listenTo(self.contentView, "preview", function() {
                        self.preview();
                    });
                });

                this.listenTo(this, "render", function() {
                    var context = {
                        template: self.model,
                        extensionsRegion: self.extensionsRegion,
                        view: self,
                    };
                    app.trigger("template-extensions-render", context);

                    var contextToolbar = {
                        template: self.model,
                        region: self.extensionsToolbarRegion,
                        view: self,
                    };
                    app.trigger("template-extensions-toolbar-render", contextToolbar);
                });

                _.bindAll(this, "preview", "previewNewPanel", "getBody");
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
                "click #embedCommand": "embed"
            },

            save: function() {
                var self = this;
                
                 if (!this.validate())
                    return;

                if (app.settings.playgroundMode) {
                    this.model.originalEntity = new $entity.Template();
                    this.model.set("_id", null);
                }

                this.model.save({}, {
                    success: function() {
                        app.trigger("template-saved", self.model);
                    }
                });
            },

            addInput: function(form, name, value) {
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                input.value = value;
                form.appendChild(input);
            },

            previewNewPanel: function() {
                this._preview("_blank");
                this.contentView.$el.find(".preview-loader").hide();
            },

            preview: function() {
                this._preview("previewFrame");
            },

            _preview: function(target) {
                this.contentView.$el.find(".preview-loader").show();
                //http://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe
                //this.contentView.$el.find("[name=previewFrame]").hide();

                var mapForm = document.createElement("form");
                mapForm.target = target;
                mapForm.method = "POST";
                mapForm.action = app.serverUrl + "api/report";

                var uiState = this.getUIState();

                var request = { template: uiState };
                var self = this;
                this.beforeRenderListeners.fire(request, function(er) {
                    if (er) {
                        self.contentView.$el.find(".preview-loader").hide();
                        app.trigger("error", { responseText: er });
                        return;
                    }

                    function addBody(path, body) {
                        if (body == null)
                            return;

                        if (body.initData != null)
                            body = body.initData;

                        for (var key in body) {
                            if (_.isObject(body[key])) {
                                addBody(path + key + "[", body[key]);
                            } else {
                                self.addInput(mapForm, path + key + "]", body[key]);
                            }
                        }
                    }

                    addBody("template[", uiState);
                    if (request.options != null)
                        addBody("options[", request.options);

                    if (request.data != null)
                        self.addInput(mapForm, "data", request.data);

                    document.body.appendChild(mapForm);
                    mapForm.submit();
                });
            },

            getUIState: function() {

                function justNotNull(o) {
                    var clone = {};
                    for (var key in o) {
                        if (o[key] != null)
                            clone[key] = o[key];
                    }

                    return clone;
                }

                var state = {};
                var json = this.model.toJSON();
                for (var key in json) {
                    if (json[key] != null) {
                        if (json[key].initData != null)
                            state[key] = justNotNull(json[key].toJSON());
                        else
                            state[key] = json[key];
                    }
                }

                state.content = state.content || " ";
                state.helpers = state.helpers || "";
                return state;
            },

            onValidate: function() {
                var res = [];

                if (this.model.get("name") == null || this.model.get("name") == "")
                    res.push({
                        message: "Name cannot be empty"
                    });

                if (this.model.get("recipe") == null)
                    res.push({
                        message: "Recipe must be selected"
                    });

                return res;
            },

            getBody: function() {
                var properties = [];
                properties.push({ key: "html", value: "..." });
                properties.push({ key: "helpers", value: "..." });

                this.model.trigger("api-overrides", function(key, value) {
                    value = value || "...";
                    properties.push({ key: key, value: _.isObject(value) ? JSON.stringify(value) : "..." });

                });
                return properties;
            },

            apiHelp: function() {
                $.dialog({
                    header: "jsreport API",
                    content: $.render["template-detail-api"](this.model.toJSON(), this),
                    hideSubmit: true
                });
            },

            embed: function() {
                var model = new BasicModel(this.model.toJSON());
                model.set({ fileInput: true, dataArea: true });
                var dialog = new EmbedDialog({ model: model });
                app.layout.dialog.show(dialog);
            }
        });
    });