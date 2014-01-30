define(["jquery", "app", "marionette", "backbone"],
    function($, app, Marionette, Backbone) {

        var module = app.module("examples", function() {

            app.on("menu-render", function(context) {
                var result = "<li class='dropdown'><a href='#' class='dropdown-toggle' data-toggle='dropdown'>Examples <b class='caret'></b></a><ul class='dropdown-menu'><li class='dropdown-header'>examples</li>";
                module.examples.forEach(function(t) {
                    result += "<li><a href='#/playground/" + t.shortid + "'>" + t.name + "</a></li>";
                });

                result += "</ul>";
                result += "</li>";
                context.result += result;
            });

            app.on("entity-registration", function(context) {
                $entity.Template.addMember("isExample", { 'type': "Edm.Boolean" });
            });

        });

        app.onStartListeners.add(function(cb) {
            var predicate = app.settings.playgroundMode ?
                function(t) { return t.isExample == true && t.version == 1; } :
                function(t) { return t.isExample == true; };

            app.dataContext.templates.filter(predicate).toArray().then(function(res) {
                module.examples = _.sortBy(res, function(t) {
                    return t.name;
                });
                
                cb();
            });
        });

        app.on("entity-registration", function(context) {
            $entity.Template.addMember("isExample", { type: "Edm.Boolean" });
        });

        return module;
    });