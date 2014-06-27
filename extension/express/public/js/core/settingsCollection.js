/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "jquery"], function(app, $) {

    app.on("entity-registration", function(context) {

        $data.Entity.extend('$entity.Settings', {
            '_id': { 'key': true, 'nullable': false, 'computed': true, 'type': 'Edm.String' },
            'key': { 'type': 'Edm.String' },
            'value': { 'type': 'Edm.String' }
        });

        $entity.Settings.prototype.toString = function() {
            return "";
        };

        context["settings"] = { type: $data.EntitySet, elementType: $entity.Settings };
    });


    app.onStartListeners.add(function(cb) {
       app.dataContext.settings.toArray().then(function(res) {
            app.settings.raw = res;

            app.settings.data = {};
            res.forEach(function(s) {
                app.settings.data[s.key] = s;
            });

            if (app.settings.data.firstRun == null) {
                app.settings.firstRun = true;
                app.settings.saveOrUpdate("firstRun", "false").then(function() {
                    cb();
                });
            } else {
                app.settings.firstRun = false;
                cb();
            }
        });
    });

    app.settings.saveOrUpdate = function(key, value) {
        if (app.settings.data[key] == null) {
            var s = new $entity.Settings({ key: key, value: value });
            app.dataContext.settings.add(s);
            app.settings.data[key] = s;
            return app.dataContext.settings.saveChanges();
        }

        s = app.settings.data[key];
        app.dataContext.settings.attach(s);
        s.value = value;
        return app.dataContext.settings.saveChanges();
    };
});