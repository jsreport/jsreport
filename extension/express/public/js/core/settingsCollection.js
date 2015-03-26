/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "jquery", "backbone", "core/basicModel"], function(app, $, Backbone, ModelBase) {

    var SettingsModel = ModelBase.extend({
        odata: "settings",
        url: function() {
          return "odata/settings";
        }
    });

    var SettingsCollection = Backbone.Collection.extend({
        model: SettingsModel,
        url: function() {
            return "odata/settings";
        }
    });


    app.onStartListeners.add(function(cb) {
        var model = new SettingsCollection();
        model.fetch({
            success: function() {
                var res = model.toJSON();
                app.settings.raw = res;

                app.settings.data = {};
                res.forEach(function(s) {
                    app.settings.data[s.key] = s;
                });

                if (app.settings.data.firstRun == null) {
                    app.settings.firstRun = true;
                    cb();
                    app.settings.saveOrUpdate("firstRun", "false", cb);
                } else {
                    app.settings.firstRun = false;
                    cb();
                }
            }
        });
    });

    app.settings.saveOrUpdate = function(key, value, cb) {
        if (app.settings.data[key] == null) {
            var s = new SettingsModel({ key: key, value: value });
            return s.save({
                success: function(data) {
                    app.settings.data[key] = data;
                    cb();
                }
            });
        }

        var setting = app.settings.data[key];
        setting.value = value;
        var s = new SettingsModel(setting);
        s.save({
            success: cb
        });
    };
});