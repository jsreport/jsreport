define(["app", "marionette", "backbone", "core/extensions/extension.manager",
        "core/extensions/extension.list.view", "core/extensions/extension.list.model"],
    function (app, Marionette, Backbone, ExtensionsManager, ExtensionListView, ExtensionListModel) {
        
        app.module("extensions", function (module) {            
         
            module.manager = new ExtensionsManager();
            
            module.init = function (cb) {
                module.manager.init(function () {
                    module.manager.loadExtensions(cb);
                });
            };
            
            app.on("menu-actions-render", function (context) {
                context.result += "<li><a id='registerExtensiosLink'>Register Extensions</a></li>";
                context.on("after-render", function ($el) {
                    $el.find("#registerExtensiosLink").click(function () {
                        app.layout.dialog.show(new ExtensionListView({
                            model: new ExtensionListModel()
                        }));
                    });
                });
            });
            
        });
    });