/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

define(["app", "core/jaydataModel"], function(app, ModelBase) {
    return ModelBase.extend({
        contextSet: function() { return app.dataContext.templates; },

        fetchQuery: function(cb) {

            var predicate = app.settings.playgroundMode ?
                function(t) { return t.shortid == this.id && t.version == this.version; } :
                function(t) { return t.shortid == this.id; };

            return app.dataContext.templates.single(predicate,
                { id: this.get("shortid"), version: this.get("version") == null ? 1 : this.get("version") });
        },

        _initialize: function() {
            this.Entity = $entity.Template;

            if (!app.settings.playgroundMode && app.settings.firstRun) {
                this.set({
                    name: "hello world",
                    content: "<h1> Hello World </h1>\n\n"
                        + "<p>Lets render some content using jsrender templating engine\n"
                        + "</p>\n\n"
                        + "{{for ~testData()}}\n<h{{:#data}}>Header {{:#data}}</h{{:#data}}>\n{{/for}}",
                    helpers: "{\n"
                        + "  testData: function() {\n"
                        + "  return [1,2,3,4,5,6];\n"
                        + "}\n"
                        + "}"
                }, { silent: true });
            }
        },

        defaults: {
            engine: "jsrender",
            recipe: "phantom-pdf",
        },
    });
});