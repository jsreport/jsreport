define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var self = this;
            
            if (app.settings.playgroundMode) {
                var obj = this.templateModel.get("dataItem") || {};
                obj = obj.initData || {};
                this.set(this.parse(obj), {silent: true});
                return options.success();
            }
            
            app.dataContext.data.toArray().then(function (items) {
                self.items = items;

                if (self.templateModel.get("dataItemId") != null) {
                    return app.dataContext.data.single(function(i) { return i.shortid == this.id; }, { id: self.templateModel.get("dataItemId") })
                        .then(function (res) {
                            self.set(self.parse(res.initData), {silent: true});
                            return options.success();
                    });
                }

                self.set(items.length > 0 ? items[0].initData : {}, { silent: true });
                return options.success();
            });
        },

        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
        },

        initialize: function () {
            var self = this;
            this.listenTo(this, "change:_id", function() {
                this.set(this.parse(_.where(self.items, { _id: self.get("_id")})[0].initData));
            });
        },

        save: function (options) {
            var self = this;
            var entity = new $entity.DataItem(this.attributes);

            if (app.settings.playgroundMode) {
                this.templateModel.set("dataItem", entity);
                return options.success();
            } 
            
            if (entity._id != null) {
                app.dataContext.data.attach(entity);
                this.copyAttributesToEntity(entity);
            } else {
                app.dataContext.data.add(entity);
            }

            app.dataContext.data.saveChanges().then(function () {
                self.templateModel.set("dataItemId", entity.shortid);
                options.success();
            });
        },
    });
});