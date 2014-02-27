/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "core/view.base", "underscore", "core/basicModel", "async"], function (app, ViewBase, _, BasicModel, async) {

    return ViewBase.extend({
        template: "extension-list",

        initialize: function () {
            var self = this;
            this.listenToOnce(this, "show", function () {
                self.$el.find('#modal').modal();
            });
        },

        events: {
            "click #saveCommand": "save"
        },
        
        save: function() {
            var self = this;
            async.each(this.model.get("extensions"), function (ext, cb) {
                var isRegisteredUpdated = self.model.get(ext.name);
                
                var command = new BasicModel();
                command.url = function () { return "extensions"; };
                command.toJSON = function () { return { name: ext.name }; };
                if (ext.isRegistered && !isRegisteredUpdated) {
                    command.isNew = function () { return false; };
                    return command.destroy({ success: cb, error: cb });
                }

                if (!ext.isRegistered && isRegisteredUpdated) {
                    return command.save(command, { success: cb, error: cb });
                }

                return cb(null);
            }, function() {
                location.reload(false);
            });
        }
    });
});
