define(["marionette", "app", "codemirror", "core/codeMirrorBinder", "core/view.base"], function (Marionette, app, Codemirror, codeMirrorBinder, ViewBase) {
    return ViewBase.extend({
        template: "scripts-dialog",
        
        events: {
            "click #saveCommand": "save",
        },
        
        onDomRefresh: function () {
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
            });
            codeMirrorBinder(this.model, "content", this.contentCodeMirror);
        },
        
        save: function () {
            var self = this;
            this.model.save({
                success: function () {
                    self.trigger("dialog-close");
                }
            });
        }
    });
});