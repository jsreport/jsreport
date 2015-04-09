define(["app", "core/basicModel", "underscore", "jquery"], function (app, ModelBase, _, $) {

    return ModelBase.extend({

        fetch: function (options) {
            var self = this;
            return app.dataProvider.get("odata/data?$select=name,shortid").then(function(items) {
                self.items = items;

                var templateResources = self.templateModel.get("resources") || { items: []};
                var resources = templateResources.items.map(function(r) {
                    return r.shortid;
                });
                self.set("resources", resources);
                self.set("language", templateResources.defaultLanguage);
            });
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
        },

        initialize: function () {
            var self = this;
            this.listenTo(this, "change", function() {
                if (!self.get("resources"))
                    return;

                self.templateModel.set("resources", {
                    items: self.get("resources").map(function(r) {
                        return {
                            entitySet: "data",
                            shortid: r
                        };
                    }),
                    defaultLanguage: self.get("language")
                });
            });
        }
    });
});