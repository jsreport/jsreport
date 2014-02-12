define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        
        fetch: function (options) {
            var obj = this.templateModel.get("dataItem") || {};
            obj = obj.initData || {};
            this.set(this.parse(obj), {silent: true});
            return options.success();
        },

        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
        },
        
        save: function (options) {
            var self = this;
            var entity = new $entity.DataItem(this.attributes);
            
            this.templateModel.set("dataItem", entity);
            return options.success();
        },
    });
});