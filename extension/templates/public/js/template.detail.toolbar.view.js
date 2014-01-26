define(["jquery", "app", "codemirror", "core/utils", "core/view.base", "core/codeMirrorBinder", "underscore"],
    function ($, app, CodeMirror, Utils, LayoutBase, binder, _) {
        return LayoutBase.extend({
            template: "template-detail-toolbar",
            
            initialize: function () {
                var self = this;
                
                this.listenTo(this, "render", function () {
                    var context = {
                        template: self.model,
                        extensionsRegion: self.extensionsRegion
                    };
                    app.trigger("template-extensions-render", context);
                    
                    var contextToolbar = {
                        template: self.model,
                        region: self.extensionsToolbarRegion
                    };
                    app.trigger("template-extensions-toolbar-render", contextToolbar);
                });

                _.bindAll(this, "preview");
            },
            
            getRecipes: function () {
                return app.recipes;
            },

            getEngines: function () {
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
            },

            
            save: function () {
                var self = this;
                
                if (app.settings.playgroundMode) {
                    this.model.originalEntity = new $entity.Template();
                    this.model.set("_id", null);
                }
             
                this.model.save({}, {
                    success: function () {
                        app.trigger("template-saved", self.model);
                    }
                });
            },


            addInput: function (form, name, value) {
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                input.value = value;
                form.appendChild(input);
            },
          
            preview: function () {
                if (!this.validate())
                    return;

                this.contentView.$el.find(".preview-loader").show();
                //http://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe
                //this.contentView.$el.find("[name=previewFrame]").hide();
                
                var mapForm = document.createElement("form");
                mapForm.target = "previewFrame";
                mapForm.method = "POST";
                mapForm.action = app.serverUrl + "report";

                var uiState = this.getUIState();
                for (var key in uiState) {
                    if (uiState.hasOwnProperty(key) && key != "_id" && key != "shortid") {
                        this.addInput(mapForm, "template[" + key + "]", uiState[key]);
                    }
                }

                document.body.appendChild(mapForm);
                mapForm.submit();
            },

            getUIState: function () {
                var state = $.extend({}, this.model.attributes);

                app.trigger("template-extensions-get-state", this.model, state);
                state.recipe = state.recipe || "html";
                return state;
            },

            onValidate: function () {
                var res = [];

                if (this.model.get("recipe") == null)
                    res.push({
                        message: "Recipe must be selected"
                    });

                return res;
            }
        });
    });

