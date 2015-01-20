define(["app", "core/jaydataModel", "jquery"], function (app, ModelBase, $) {
    return ModelBase.extend({
        contextSet: function () { return app.dataContext.scripts; },

       fetchQuery: function (cb) {
            return this.contextSet().single(function(r) { return r.shortid === this.id; }, { id: this.get("shortid") });
        },    
        
        setTemplateModel: function(templateModel) {
            this.templateModel = templateModel;
        },
        
        _initialize: function () {
            this.Entity = $entity.Script;
        },

        toString: function() {
            return "Script " + (this.get("name") || "");
        }
    });
});

