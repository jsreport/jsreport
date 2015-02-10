/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(path.join(__dirname, "../../"), ["html", "templates", "childTemplates"], function (reporter) {

    describe('childTemplates', function () {

        it('should replace child template mark with its content', function (done) {

            reporter.templates.create({
                content: "{{>~a()}}",
                engine: "jsrender",
                helpers: "function a() { return \"foo\"; }",
                recipe: "html",
                name: "t1" }).then(function (t) {

                var request = {
                    template: {content: "a{#child t1}ba{#child t1}", recipe: "html", engine: "jsrender"},
                    context: reporter.context
                };

                return reporter.render(request, {}).then(function (resp) {
                    assert.equal(resp.result, "afoobafoo");
                    done();
                }).catch(done);
            });
        });

        it('should be able to build child template name using javascript templating engines', function (done) {

            reporter.templates.create({
                content: "childA",
                engine: "jsrender",
                recipe: "html",
                name: "a" }).then(function (t) {

                var request = {
                    template: {
                        content: "{#child {{:~getChildTemplateName()}}}",
                        engine: "jsrender",
                        recipe: "html",
                        helpers: "function getChildTemplateName() { return 'a'; }"
                    },
                    context: reporter.context
                };

                return reporter.render(request, {}).then(function (resp) {
                    assert.equal(resp.result, "childA");
                    done();
                });
            }).catch(done);
        });
    });
});