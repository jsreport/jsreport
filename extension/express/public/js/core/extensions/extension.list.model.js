/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "core/basicModel", "underscore"], function (app, ModelBase, _) {
    return ModelBase.extend({
        initialize: function () {
            var self = this;
            self.set("extensions", app.extensions.manager.extensions);
            
            _.each(app.extensions.manager.extensions, function (e) {
                self.set(e.name, e.isRegistered);
            });
        }
    });
});
