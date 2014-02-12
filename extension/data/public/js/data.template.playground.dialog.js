define(["marionette", "app", "codemirror", "core/view.base", "core/codeMirrorBinder"], function (Marionette, app, Codemirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "data-dialog",
        
        events: {
            "click #saveCommand": "save",
        },
        
        initialize: function() {
            _.bindAll(this, "save");
        },
        
        onDomRefresh: function () {
            
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
            });
            codeMirrorBinder(this.model, "dataJson", this.contentCodeMirror);
        },
        
        save: function () {
            var self = this;
            this.model.save({ success: function() {
                self.trigger("dialog-close");
            }});
        }
    });
});