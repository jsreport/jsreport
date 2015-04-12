define(["app", "core/basicModel", "underscore", "jquery"], function (app, ModelBase, _, $) {

    return ModelBase.extend({

        fetch: function (options) {
            var self = this;
            this.fetching = true;
            return app.dataProvider.get("odata/data?$select=name,shortid").then(function(items) {
                self.items = items;

                var templateResources = self.templateModel.get("resources") || { items: []};
                var resources = templateResources.items.map(function(r) {
                    return r.shortid;
                });
                self.set("resources", resources);
                self.set("language", templateResources.defaultLanguage);
                self.fetching = false;
            });
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            this.listenTo(this.templateModel, "api-overrides", this.apiOverride);
        },

        apiOverride: function(req) {
            req.options.language = "...";
        },

        initialize: function () {
            var self = this;

            this.listenTo(this, "change", function() {
                var resources = self.get("resources") || [];

                self.templateModel.set("resources", {
                    items: resources.map(function(r) {
                        return {
                            entitySet: "data",
                            shortid: r
                        };
                    }),
                    defaultLanguage: self.get("language")
                }, { silent: self.fetching});
            });
        }
    });
});