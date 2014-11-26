define(["marionette", "core/view.base", "core/aceBinder"], function(Marionette, ViewBase, aceBinder) {
    return ViewBase.extend({
        template: "scripts-detail",

        initialize: function() {
            this.listenTo(this.model, "sync", this.render);
        },

        onDomRefresh: function() {

            var top = $("#contentWrap").position().top;
            
            this.contentEditor = ace.edit("contentArea");
            this.contentEditor.setTheme("ace/theme/chrome");
            this.contentEditor.getSession().setMode("ace/mode/javascript");
            this.contentEditor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });
                
            aceBinder(this.model, "content", this.contentEditor);
            
            $("#contentArea").css("margin-top", top);
        },

        validateLeaving: function() {
            return !this.model.hasChangesSyncLastSync();
        }
    });
});