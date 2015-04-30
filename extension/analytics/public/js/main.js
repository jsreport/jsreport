define(["app", "marionette", "backbone", "jquery"],
    function (app, Marionette, Backbone, $) {

        app.onStartListeners.add(function(cb) {
            cb();

            if (app.settings.data.analytics && (app.settings.data.analytics.value === "cancelled" || app.settings.data.value === "ok"))
                return;

            setTimeout(function () {
                app.settings.saveOrUpdate("analytics", "cancelled");
                $.dialog({
                    header: "Help us to improve jsreport",
                    content: "Click Yes to allow jsreport to send anonymous usage statistics and give us feedback about the most used features.",
                    onSubmit: function () {
                        app.settings.saveOrUpdate("analytics", "ok");
                    }
                });
            }, 10000);
        });
    });
