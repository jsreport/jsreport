define('phantom.template.view',["app", "marionette", "core/view.base"], function(app, Marionette, ViewBase) {
    return ViewBase.extend({
        tagName: "li",
        template: "phantom-template",
         
          initialize: function() {
            _.bindAll(this, "isFilled");
        },

        isFilled: function() {
            return this.model.isDirty();
        },
        
         onClose: function() {
             this.model.templateModel.unbind("api-overrides", this.model.apiOverride, this.model);
         }
    });
});
define('phantom.template.model',["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            
            if (templateModel.get("phantom") == null) {
                 templateModel.set("phantom", new $entity.Phantom());
            }
            
            this.set(templateModel.get("phantom").initData);

            if (this.get("orientation") == null)
                this.set("orientation", "portrait");

            
            if (this.get("format") == null) {
                this.set("format", "A4");
            }

            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        isDirty: function() {
            return this.get("margin") != null || this.get("header") != null || this.get("footer") != null ||
                this.get("width") != null || this.get("height") != null || this.get("orientation") != "portrait" ||
                this.get("format") != "A4";
        },
        
        apiOverride: function(addProperty) {
            addProperty("phantom", {
                    maring: this.get("margin") || "...",
                    header: this.get("header") || "...",
                    footer: this.get("footer") || "...",
                    headerHeight: this.get("headerHeight") || "...",
                    footerHeight: this.get("footerHeight") || "...",
                    format: this.get("format") || "...",
                    orientation: this.get("orientation") || "...",
                    width: this.get("width") || "...",
                    height: this.get("height") || "..."
                });
        },

        initialize: function () {
            var self = this;
            
            this.listenTo(this, "change", function() {
                self.copyAttributesToEntity(self.templateModel.get("phantom"));
            });
        }
    });
});
define(["jquery", "app", "marionette", "backbone", "phantom.template.view", "phantom.template.model"],
    function($, app, Marionette, Backbone, TemplateView, Model) {

        app.on("template-extensions-render", function(context) {
            var view;

            function renderRecipeMenu() {
                if (context.template.get("recipe") == "phantom-pdf") {
                    var model = new Model();
                    model.setTemplate(context.template);
                    view = new TemplateView({ model: model});
                    
                    context.extensionsRegion.show(view, "phantom");
                } else {
                    if (view != null)
                        $(view.el).remove();
                }
            }

            renderRecipeMenu();

            context.template.on("change:recipe", function() {
                renderRecipeMenu();
            });
        });

        app.on("entity-registration", function(context) {
            $data.Class.define("$entity.Phantom", $data.Entity, null, {
                'margin': { 'type': 'Edm.String' },
                'header': { 'type': 'Edm.String' },
                'footer': { 'type': 'Edm.String' },
                'headerHeight': { 'type': 'Edm.String' },
                'footerHeight': { 'type': 'Edm.String' },
                'orientation': { 'type': 'Edm.String' },
                'format': { 'type': "string" },
                'width': { 'type': "string" },
                'height': { 'type': "string" }
            }, null);
            
            $entity.Template.addMember("phantom", { 'type': "$entity.Phantom" });
        });
    });
