define(["marionette", "codemirror", "core/view.base", "core/codeMirrorBinder"], function(Marionette, CodeMirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "data-detail",

        initialize: function() {
            var self = this;
            this.listenTo(this.model, "sync", self.render);
        },

        onDomRefresh: function() {

            var top = $("#contentWrap").position().top;

            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
                lineWrapping: true
            });

            codeMirrorBinder(this.model, "dataJson", this.contentCodeMirror);

            $(this.contentCodeMirror.getWrapperElement()).addClass(this.$el.find("#contentArea").attr('class'));
            $(this.contentCodeMirror.getWrapperElement()).css("margin-top", top);

            this.contentCodeMirror.refresh();
        },

        validateLeaving: function() {
            return !this.model.hasChangesSyncLastSync();
        },
    });
});