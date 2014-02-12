define(["marionette", "codemirror", "core/view.base", "core/codeMirrorBinder"], function(Marionette, CodeMirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "data-detail",

        initialize: function () {
            var self = this;
            this.listenTo(this.model, "sync", self.render);
        },
        
        onDomRefresh: function () {
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
                lineWrapping: true
            });
            
             codeMirrorBinder(this.model, "dataJson", this.contentCodeMirror);
        },
    });
});

