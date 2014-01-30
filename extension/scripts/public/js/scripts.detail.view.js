define(["marionette", "codemirror", "core/view.base", "core/codeMirrorBinder"], function(Marionette, CodeMirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "scripts-detail",

        initialize: function () {
            this.listenTo(this.model, "sync", this.render);
        },

        onDomRefresh: function () {
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
                lineWrapping: true
            });
            
            codeMirrorBinder(this.model, "content", this.contentCodeMirror);

            var self = this;
            this.$el.find("#name").hover(function() {
                alert("in");
                self.$el.find("#nameInput").show();
                self.$el.find("#name").hide();
            }, function() {
                alert("out");
                self.$el.find("#nameInput").hide();
                self.$el.find("#name").show();
            });
        },
   });
});

