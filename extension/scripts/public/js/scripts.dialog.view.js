define(["marionette", "app", "codemirror", "core/codeMirrorBinder", "core/view.base"], function (Marionette, app, Codemirror, codeMirrorBinder, ViewBase) {
    return ViewBase.extend({
        template: "scripts-dialog",
        
        events: {
            "click #saveCommand": "save",
            "click #createCommand": "create",
        },
        
        initialize: function () {
            _.bindAll(this, "getItems", "getItemsLength");
        },


        getItems: function () {
            return this.model.items;
        },

        getItemsLength: function () {
            return this.model.items.length;
        },
        
        
        onDomRefresh: function () {
            var self = this;

            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
            });
            codeMirrorBinder(this.model, "content", this.contentCodeMirror);
        },
        

        create: function () {
            app.scripts.trigger("create");
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