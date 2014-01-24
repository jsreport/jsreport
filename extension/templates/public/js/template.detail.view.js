define(["jquery", "app", "codemirror", "core/utils", "core/view.base", "core/codeMirrorBinder"],
    function ($, app, CodeMirror, Utils, LayoutBase, codeMirrorBinder) {

        return LayoutBase.extend({
            template: "template-detail",
            htmlCodeMirror: null,
            helpersCodeMirror: null,

            initialize: function () {
                var self = this;
                
                this.listenTo(this.model, "sync", function () {
                    self.render();
                });
            },

            onDomRefresh: function () {
                var self = this;

                this.htmlCodeMirror = CodeMirror.fromTextArea(this.$el.find("#htmlArea")[0], {
                    mode: "application/xml",
                    lineNumbers: true,
                });
                codeMirrorBinder(this.model, "html", this.htmlCodeMirror);

               this.helpersCodeMirror = CodeMirror.fromTextArea(this.$el.find("#helpersArea")[0], {
                    mode: "javascript",
                    lineNumbers: true,
               });
               codeMirrorBinder(this.model, "helpers", this.helpersCodeMirror);

                this.$el.find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                    self.helpersCodeMirror.refresh();
                    self.htmlCodeMirror.refresh();
                });


                self.$el.find("#previewFrameWrap").contents().find('html').html(
                    "<iframe name='previewFrame' frameborder='0' allowtransparency='true' allowfullscreen='true' style='width: 100%; height: 100%;'></iframe>");
                

                self.$el.find("[name=previewFrame]").on("load", function () {
                        self.$el.find(".preview-loader").hide();
                        //http://connect.microsoft.com/IE/feedback/details/809377/ie-11-load-event-doesnt-fired-for-pdf-in-iframe
                        //$(this).show();
                });

                self.listenTo(app.layout, "dialog-opening", function() {
                    self.$el.find("[name=previewFrame]").hide();
                });
                
                self.listenTo(app.layout, "dialog-closing", function() {
                    self.$el.find("[name=previewFrame]").show();
                });
                

                this.$el.find(".split-pane").splitPane();
            },
        });
    });

