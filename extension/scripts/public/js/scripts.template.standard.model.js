define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;
            
            app.dataContext.scripts.toArray().then(function (items) {
                self.items = items.map(function(i) { return i.initData; });

                var script = self.templateModel.get("script");

                if (!script) {
                    script = new $entity.ScriptRefType();

                    //back compatibility
                    if (self.templateModel.get("scriptId")) {
                        script.shortid = self.templateModel.get("scriptId");
                    }

                    self.templateModel.set("script", script);
                }


                var custom = { name: "- custom -", shortid: "custom", content:   script.content};
                self.items.unshift(custom);

                var empty = { name: "- not selected -", shortid: null };
                self.items.unshift(empty);

                if (!script.content && !script.shortid)
                    self.set(empty, { silent: true });

                if (script.shortid)
                    self.set(_.findWhere(items, { shortid: script.shortid }).toJSON(), { silent: true });

                if (script.content)
                    self.set(custom, { silent: true });
                
                 return options.success();
            });
        },

        setTemplate: function (templateModel) {
            this.templateModel = templateModel;
            this.listenTo(templateModel, "api-overrides", this.apiOverride);
        },
        
        apiOverride: function(addProperty) {
             addProperty("scriptId", this.get("shortid"));
        },

        newCustomScript: function() {

        },
 
        initialize: function () {
            var self = this;
            this.listenTo(this, "change:shortid", function() {
                self.templateModel.get("script").shortid = self.get("shortid") !== "custom" ? self.get("shortid") : undefined;
                self.templateModel.get("script").content = self.get("shortid") === "custom" ? self.get("content") : undefined;
                self.set(_.findWhere(self.items, { shortid: self.get("shortid")}));
            });

            this.listenTo(this, "change:content", function() {
                if (self.get("shortid") === "custom") {
                    self.templateModel.get("script").content = self.get("content");
                    _.findWhere(self.items, { shortid: "custom" }).content = self.get("content");
                }
            });
        }
    });
});