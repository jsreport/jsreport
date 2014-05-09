/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["underscore"], function (_) {
    return function (model, path, editor) {
        var settingChange = false;
        
        function updateModel() {
             settingChange = true;
            
            model.set(path, editor.getValue());
            settingChange = false;
        }
        
        var lazyUpdateModel = _.debounce(updateModel, 300);
        editor.on("change", lazyUpdateModel);

        model.listenTo(model, "change:" + path, function () {
            if (settingChange) return;
            editor.setValue(model.get(path) || "", -1);
        });
    };
});
