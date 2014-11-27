define(["app", "underscore", "core/view.base", "core/utils", "jquery"], function(app, _, ViewBase, Utils, $) {
    return ViewBase.extend({
        tagName: "li",
        template: "report-template-toolbar",

        initialize: function() {
            _.bindAll(this, "renderReport", "onReportRender");
        },
       
        events: {
           "click #renderCommand": "renderReport"
        },

        linkToTemplateView: function(view) {
            this.templateView = view;
            this.templateView.beforeRenderListeners.add(this.onReportRender);
        },

        onReportRender: function(request, cb) {
            if (this.processingReport) {
                request.options.saveResult = true;
            }
            this.processingReport = false;

            cb();
        },

        renderReport: function() {
            app.trigger("toastr:info", "Report generation processing ...");
            this.processingReport = true;
            this.templateView.preview();
        }
    });
});