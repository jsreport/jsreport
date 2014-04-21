define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
   
    return ModelBase.extend({
        setTemplateModel: function (templateModel) {
            this.templateModel = templateModel;

            var defaultJson = "{\n  \"_comment\": \"this is must be valid JSON\",\n  \"people\" : [ { \"name\": \"Jan Blaha\" } ]\n}";
            this.set("dataJson", templateModel.get("dataItem").dataJson || defaultJson);
        },
        
        save: function (options) {
            this.templateModel.get("dataItem").dataJson = this.get("dataJson");
            return options.success();
        },
    });
});