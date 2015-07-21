define(["app", "marionette", "backbone", "jquery"],
    function (app, Marionette, Backbone, $) {
        
        app.onStartListeners.add(function(cb) {
            cb();

            if (app.settings.data.license && app.settings.data.license.value)
                return;

            setTimeout(function () {

                $.getJSON("odata/templates/$count", function(data) {
                    if (data.value > 5) {
                        $.dialog({
                            hideSubmit: true,
                            header: "<span class='text text-danger'>Free license exceeded</span>",
                            content: "<p>Free license is limited to maximum 5 templates. Please buy the enterprise license before you continue.</p>" +
                            "<p>The instructions for buying enterprise license can be found <a href='http://jsreport.net/buy' target='_blank'>here</a>.</p>"
                        });
                    }
                });
            }, 1000);
        });
    });
