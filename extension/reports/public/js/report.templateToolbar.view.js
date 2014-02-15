define(["app", "core/view.base", "core/utils", "jquery"], function(app, ViewBase, Utils, $) {
    return ViewBase.extend({
        tagName: "li",
        template: "report-template-toolbar",

        initialize: function() {
            _.bindAll(this, "renderReport");
        },
       
        events: {
           "click #renderCommand": "renderReport",
        },

        renderReport: function() {
            var self = this;
            app.trigger("toastr:info", "Report generation started ...");
            
            $.ajax({
                url: app.serverUrl + "report",
                type: 'POST',
                data: JSON.stringify({
                    template: self.templateView.getUIState(),
                    options: { async: true }
                })
            })
                .then(function() {
                    app.trigger("toastr:info", "Report generation succefully finished.");
                })
                .fail(function(e) {
                    app.trigger("error", e);
                });
        },
    });
});