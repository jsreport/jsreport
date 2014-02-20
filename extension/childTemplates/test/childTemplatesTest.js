var assert = require("assert"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(["childTemplates"], function(reporter) {

    describe('childTemplates', function() {

        it('should replace', function(done) {

            reporter.templates.create({
                content: "{{>~a()}}",
                helpers: "{ a: function() { return \"foo\"; } }",
                recipe: "html",
                name: "child test" }).then(function(t) {

                var request = {
                    template: { content: "a{#child test}ba{#child test}" },
                    context: reporter.context,
                };

                reporter.childTemplates.handleBeforeRender(request, {}).then(function() {
                    assert.equal("afoobafoo", request.template.content);
                    done();
                });
            });
        });
    });
});