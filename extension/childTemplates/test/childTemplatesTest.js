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
                    template: { content: "a{#child t1}ba{#child t1}" },
                    context: reporter.context
                };

                return reporter.childTemplates.handleBeforeRender(request, {}).then(function () {
                    assert.equal("afoobafoo", request.template.content);
                    done();
                });
            }).catch(done);
        });
    });
});