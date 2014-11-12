define(["marionette", "core/view.base", "core/aceBinder"], function(Marionette, ViewBase, aceBinder) {
    return ViewBase.extend({
        template: "data-detail",

        initialize: function() {
            var self = this;
            this.listenTo(this.model, "sync", self.render);
        },

        onDomRefresh: function() {

            var top = $("#contentWrap").position().top;

            this.contentEditor = ace.edit("contentArea");
            this.contentEditor.setTheme("ace/theme/chrome");
            this.contentEditor.getSession().setMode("ace/mode/json");
            this.contentEditor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });
                
            aceBinder(this.model, "dataJson", this.contentEditor);

            $("#contentArea").css("margin-top", top);
        },

        validateLeaving: function() {
            return !this.model.hasChangesSyncLastSync();
        }
    });
});