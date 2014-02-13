define(["marionette", "codemirror", "core/view.base", "core/codeMirrorBinder"], function(Marionette, CodeMirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "scripts-detail",
        className : 'full',

        initialize: function () {
            this.listenTo(this.model, "sync", this.render);
        },

        onDomRefresh: function () {
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
                lineWrapping: true,
                viewportMargin: Infinity,
                iframeClass: 'CodeMirror'
            });
            
            
            
            codeMirrorBinder(this.model, "content", this.contentCodeMirror);
            
            $(this.contentCodeMirror.getWrapperElement()).addClass(this.$el.find("#contentArea").attr('class'));
        },
   });
});

