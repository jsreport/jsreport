define(["marionette", "app", "core/view.base", "core/aceBinder"], function(Marionette, app, ViewBase, aceBinder) {
    return ViewBase.extend({
        template: "data-dialog",

        events: {
            "click #saveCommand": "save",
        },

        initialize: function() {
            _.bindAll(this, "save");
        },

        onDomRefresh: function() {

            this.contentEditor = ace.edit("contentArea");
            this.contentEditor.setTheme("ace/theme/chrome");
            this.contentEditor.getSession().setMode("ace/mode/json");
            this.contentEditor.setOptions({
                enableBasicAutocompletion: true,
                enableSnippets: true
            });

            aceBinder(this.model, "dataJson", this.contentEditor);
        },

        save: function(s, e) {

            if (this.model.get("dataJson") != null && this.model.get("dataJson") !== "") {
                try {
                    var json = JSON.parse(this.model.get("dataJson"));
                } catch(e) {
                    alert("You must enter a valid JSON. e.g. { \"propertName\": \"propertyValue\"} ");
                    return;
                }
            }

            var self = this;
          
            this.model.save({
                success: function() {
                    self.trigger("dialog-close");
                }
            });
        }
    });
});