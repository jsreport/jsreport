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
            app.trigger("toastr:info", "Report generation started ...");
            
            $.ajax({
                url: app.serverUrl + "report",
                type: 'POST',
                data: JSON.stringify({
                    template: { _id: Utils.decodeBase64(this.model.get("_id")) },
                    options: { async: true }
                })
            })
                .then(function() {
                    app.trigger("toastr:info", "Report generation succefully finished.");
                })
                .fail(function(e) {
                    $.dialog({
                        header: e.statusText,
                        content: e.responseText,
                        hideSubmit: true
                    });
                });
        },
    });
});