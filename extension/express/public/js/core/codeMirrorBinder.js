define([], function () {
    
    return function (model, path, editor) {
        var settingChange = false;
        editor.on("change", function () {
            settingChange = true;
            model.set(path, editor.getValue());
            settingChange = false;
        });

        model.listenTo(model, "change:" + path, function () {
            if (settingChange) return;
            editor.setValue(model.get(path) || "");
        });
    };
});
