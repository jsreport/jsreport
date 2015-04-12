define(["app", "core/basicModel", "underscore", "jquery"], function (app, ModelBase, _, $) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;

            function processItems(items) {
                self.items = items;

                var data = self.templateModel.get("data");

                if (!data) {
                    data = {};

                    //back compatibility
                    if (self.templateModel.get("dataItemId")) {
                        data.shortid = self.templateModel.get("dataItemId");
                    }

                    self.templateModel.set("data", data);
                }
                var custom;
                if (app.options.data.allowCustom) {
                    custom = {name: "- custom -", shortid: "custom", dataJson: data.dataJson};
                    self.items.unshift(custom);
                }

                var empty = { name: "- not selected -", shortid: null };
                self.items.unshift(empty);

                if (!data.dataJson && !data.shortid)
                    self.set(custom || empty, { silent: true });

                if (data.shortid) {
                    self.set(_.findWhere(self.items, {shortid: data.shortid}), {silent: true});
                }

                if (data.dataJson)
                    self.set(custom || empty, { silent: true });

                return $.Deferred().resolve();
            }

            if (app.options.data.allowSelection) {
                return app.dataProvider.get("odata/data?$select=name,shortid").then(processItems);
            } else {
                return processItems([]);
            }
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        apiOverride: function(req) {
            req.template.data = { "shortid": this.get("shortid") || "...", "dataJson": "{\'foo\' : \'...\' }" };
        },

        initialize: function () {
            var self = this;

            this.listenTo(this, "change:shortid", function() {
                self.templateModel.get("data").shortid = self.get("shortid") !== "custom" ? self.get("shortid") : undefined;
                self.templateModel.get("data").dataJson = self.get("shortid") === "custom" ? self.get("dataJson") : undefined;
                self.set(_.findWhere(self.items, { shortid: self.get("shortid")}));
            });

            this.listenTo(this, "change:dataJson", function() {
                if (self.get("shortid") === "custom") {
                    self.templateModel.get("data").dataJson = self.get("dataJson");
                    _.findWhere(self.items, { shortid: "custom" }).dataJson = self.get("dataJson");
                }
            });
        }
    });
});