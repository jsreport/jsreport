/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "introJs", "jquery"], function(app, introJs, $) {

    app.bind("view-render", function(view) {

        function introDialog(cb) {
            if (!view.introTemplate)
                return cb();

            var dialog = $.dialog({
                header: "Introduction",
                content: $.render[view.introTemplate](view.model.toJSON(), view),
                hideButtons: true
            }).on('hidden.bs.modal', function() {
                dialog.off('hidden.bs.modal');
                cb();
            });
        };

        if (!view.introId)
            return;

        setTimeout(function() {
            
            if (app.settings.playgroundMode && localStorage.getItem(view.introId) == null) {
                localStorage.setItem(view.introId, "true");
                introDialog(function() {
                    introJs().start();
                });
            }
            
            if (!app.settings.playgroundMode && app.settings.data[view.introId] == null) {
                app.settings.saveOrUpdate(view.introId, "true");
                
                introDialog(function() {
                    app.trigger("introduction-dialog-closed");
                    introJs().start();
                });
            }
        }, 1000);
    });
});