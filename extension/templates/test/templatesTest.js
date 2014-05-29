var assert = require("assert"),
    fs = require('fs'),
    path = require("path"),
    Q = require("q"),
    jaydata = require("odata-server"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    describeReportingPlayground = require("../../../test/helpers.js").describeReportingPlayground;

describeReporting(path.join(__dirname, "../../"), [], function(reporter) {

    describe('templating', function() {

        it('should callback error when missing template', function(done) {
            var request = {
                template: { _id: "AAAAAAAAAAAAAAAAAAAAAAAA" },
                context: reporter.context,
                options: { recipe: "html" }
            };

            var response = {};

            reporter.templates.handleBeforeRender(request, response).fail(function(err) {
                assert.notEqual(null, err);
                done();
            });
        });


        it('handleBefore should find by _id and use template', function(done) {
            var request = {
                template: {},
                context: reporter.context,
                options: { recipe: "html" }
            };

            reporter.templates.create({ content: "foo" }).then(function(t) {
                request.template._id = t._id;
                reporter.templates.handleBeforeRender(request, {}).then(function() {
                    assert.equal("foo", request.template.content);

                    done();
                });
            });
        });

        it('handleBefore should find by shortid and use template', function(done) {
            var request = {
                template: {},
                context: reporter.context,
                options: { recipe: "html" }
            };

            reporter.templates.create({ content: "foo" }).then(function(t) {
                request.template.shortid = t.shortid;
                reporter.templates.handleBeforeRender(request, {}).then(function() {
                    assert.equal("foo", request.template.content);

                    done();
                });
            });
        });

        it('handleBefore with not existing template should fail requesting handleBefore second time with existing template should succeed', function(done) {
            var request = {
                template: {},
                context: reporter.context,
                options: { recipe: "html" }
            };

            reporter.templates.create({ content: "foo" }).then(function(t) {
                request.template.shortid = "not existing";

                reporter.templates.handleBeforeRender(request, {}).fail(function() {
                    request = {
                        template: { shortid: t.shortid },
                        context: reporter.context,
                        options: { recipe: "html" }
                    };

                    reporter.templates.handleBeforeRender(request, {}).then(function() {
                        console.log(request.template.content);
                        assert.equal("foo", request.template.content);

                        done();
                    });
                });
            });
        });

        it('handleBefore should throw when no content and id specified', function() {
            var request = {
                template: {},
                context: reporter.context,
                options: { recipe: "html" }
            };

            assert.throws(function() { reporter.templates.handleBeforeRender(request, {}); });
        });

        it('deleting should work', function(done) {
            reporter.templates.create({ content: "foo" })
                .then(function(t) {
                    reporter.context.templates.remove(t);

                    reporter.context.templates.saveChanges().then(function() {
                        reporter.context.templates.toArray().then(function(list) {
                            assert.equal(list.length, 0);
                            done();
                        });
                    });
                });
        });
    });
});

describeReportingPlayground(path.join(__dirname, "../../"), [], function(reporter) {

    describe('templating playground', function() {

        it('handleBefore should find by shortid and version and use template', function(done) {
            var request = {
                template: {},
                context: reporter.context,
                options: { recipe: "html" }
            };

            reporter.templates.create({ content: "foo" }).then(function(t) {
                request.template.shortid = t.shortid;
                request.template.version = t.version;
                reporter.templates.handleBeforeRender(request, {}).then(function() {
                    assert.equal("foo", request.template.content);
                    done();
                });
            });
        });

        it('deleting template should be rejected', function(done) {
            reporter.templates.create({ content: "foo" })
                .then(function(t) {
                    reporter.context.templates.remove(t);
                    reporter.context.templates.saveChanges().then(function() {
                        reporter.context.templates.find(t._id).then(function(templ) {
                            assert.equal("foo", templ.content);
                            done();
                        });
                    });
                });
        });

        it('updating template should be rejected', function(done) {
            reporter.templates.create({ content: "foo" })
                .then(function(t) {
                    reporter.context.templates.attach(t);
                    t.content = "modified";
                    reporter.context.templates.saveChanges().then(function() {
                        reporter.context.templates.find(t._id).then(function(templ) {
                            assert.equal("foo", templ.content);
                            done();
                        });
                    });
                });
        });

        it('creating template with same shortid should increase version', function(done) {
            reporter.templates.create({ content: "foo" })
                .then(function(t) {
                    return reporter.templates.create({ content: "foo", shortid: t.shortid });
                })
                .then(function(t) {
                    assert.equal(2, t.version);
                    done();
                });
        });

        it('creating template with different shortid should increase version', function(done) {
            reporter.templates.create({ content: "foo" })
                .then(function(t) {
                    return reporter.templates.create({ content: "foo", shortid: t.shortid + "DIFFERENT" });
                })
                .then(function(t) {
                    assert.equal(1, t.version);
                    done();
                });
        });
    });
});