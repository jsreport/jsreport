define(["marionette", "app", "core/aceBinder", "core/view.base"], function(Marionette, app, aceBinder, ViewBase) {
    return ViewBase.extend({
        template: "scripts-dialog",

        events: {
            "click #saveCommand": "save",
        },
        
        initialize: function() {
            _.bindAll(this, "save");
        },

        onDomRefresh: function() {
            this.contentEditor = ace.edit("contentArea");
            this.contentEditor.setTheme("ace/theme/chrome");
            this.contentEditor.getSession().setMode("ace/mode/javascript");
            this.contentEditor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });

            aceBinder(this.model, "content", this.contentEditor);
        },

        save: function() {
            var self = this;
            this.model.save({
                success: function() {
                    self.trigger("dialog-close");
                }
            });
        }
    });
});