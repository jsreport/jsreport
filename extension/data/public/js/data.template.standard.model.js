define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;
            
            app.dataContext.data.toArray().then(function (items) {
                self.items = items.map(function(i) { return i.initData; });

                var data = self.templateModel.get("data");

                if (!data) {
                    data = new $entity.DataItemRefType();

                    //back compatibility
                    if (self.templateModel.get("dataItemId")) {
                        data.shortid = self.templateModel.get("dataItemId");
                    }

                    self.templateModel.set("data", data);
                }


                var custom = { name: "- custom -", shortid: "custom", dataJson:   data.dataJson};
                self.items.unshift(custom);

                var empty = { name: "- not selected -", shortid: null };
                self.items.unshift(empty);

                if (!data.dataJson && !data.shortid)
                    self.set(empty, { silent: true });

                if (data.shortid)
                    self.set(_.findWhere(items, { shortid: data.shortid }).toJSON(), { silent: true });

                if (data.dataJson)
                    self.set(custom, { silent: true });

                return options.success();
            });
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        apiOverride: function(addProperty) {
            addProperty("dataItemId", this.get("shortid"));
        },

        initialize: function () {
            var self = this;

            this.listenTo(this, "change:shortid", function() {
                self.templateModel.get("data").shortid = self.get("shortid") !== "custom" ? self.get("shortid") : undefined;
                self.templateModel.get("data").dataJson = self.get("shortid") === "custom" ? self.get("content") : undefined;
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