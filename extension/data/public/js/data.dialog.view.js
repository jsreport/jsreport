define(["marionette", "app", "codemirror", "core/view.base", "core/codeMirrorBinder"], function (Marionette, app, Codemirror, ViewBase, codeMirrorBinder) {
    return ViewBase.extend({
        template: "data-dialog",
        
        events: {
            "click #saveCommand": "save",
            "click #createCommand": "create",
        },
        
        initialize: function() {
            _.bindAll(this, "getItems", "getItemsLength");
        },
        
        onDomRefresh: function () {

            if (this.model.get("_id") == null)
                return;
            
            this.contentCodeMirror = CodeMirror.fromTextArea(this.$el.find("#contentArea")[0], {
                mode: "javascript",
                height: "350px",
                lineNumbers: true,
            });
            codeMirrorBinder(this.model, "dataJson", this.contentCodeMirror);
        },
        
        getItems: function () {
            return this.model.items;
        },
        
        getItemsLength: function () {
            return this.model.items.length;
        },
        
        create: function () {
            app.data.trigger("create");
        },
        
        save: function () {
            var self = this;
            this.model.save({ success: function() {
                self.trigger("dialog-close");
            }});
        }
    });
});