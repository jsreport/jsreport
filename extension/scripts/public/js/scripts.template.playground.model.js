define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
    return ModelBase.extend({

        fetch: function (options) {
            var self = this;
            
            var obj = this.templateModel.get("script") || {};
            obj = obj.initData || {};
            this.set(this.parse(obj), { silent: true });
            return options.success();
        },

        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;
        },
      

        save: function (options) {
            var entity = new $entity.Script(this.attributes);
            this.templateModel.set("script", entity);
            return options.success();
        },
    });
});

