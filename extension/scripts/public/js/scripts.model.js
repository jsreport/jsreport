define(["app", "core/jaydataModel", "jquery"], function (app, ModelBase, $) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.scripts; },

        fetchQuery: function () {
            return app.dataContext.scripts.find(this.get("_id"));
        },
        
        setTemplateModel: function(templateModel) {
            this.templateModel = templateModel;
        },
        
        _initialize: function () {
            this.Entity = $entity.Script;
        },
    });
});

