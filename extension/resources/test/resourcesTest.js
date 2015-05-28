/*globals describe, it, beforeEach, afterEach */

var should = require("should"),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../../"), ["templates", "data", "resources", "scripts"], function (reporter) {

    describe('with resources extension', function () {

        it('should parse resource into the options.resources collection', function (done) {
            reporter.documentStore.collection("data").insert({ name: "foo", dataJson: "{ \"foo\": \"x\"}"}).then(function (data) {
                var template = {
                    resources: {
                        items: [{shortid: data.shortid, entitySet: "data"}]
                    }
                };

                var request = {template: template, options: {}, data: {}};
                return reporter.resources.handleBeforeRender(request, {}).then(function (response) {

                    request.options.should.have.property("resources");
                    request.options.resources.should.have.length(1);

                    request.data.should.have.property("$resources");
                    request.data["$resources"].should.have.length(1);

                    request.options.should.have.property("resource");
                    request.options.resource.should.have.property("foo");
                    request.options.resource.foo.should.have.property("foo");

                    request.data.should.have.property("$resource");
                    request.data["$resource"].should.have.property("foo");
                    request.data["$resource"].foo.should.have.property("foo");

                    done();
                });
            }).catch(done);
        });

        it('should parse resource based on language into localizedResource', function (done) {
            reporter.documentStore.collection("data").insert({ name: "en-foo", dataJson: "{ \"foo\": \"x\"}"}).then(function (data) {
                var template = {
                    resources: {
                        items: [{shortid: data.shortid, entitySet: "data"}]
                    }
                };

                var request = {template: template, options: { language: "en"}, data: {}};
                return reporter.resources.handleBeforeRender(request, {}).then(function (response) {
                    request.data.should.have.property("$localizedResource");
                    request.data.$localizedResource.should.have.property("foo");

                    done();
                });
            }).catch(done);
        });

        it('should parse resource based on language into localizedResource by names when multiple resources are applicable', function (done) {
            reporter.documentStore.collection("data").insert({ name: "en-data1", dataJson: "{ \"foo\": \"x\"}"}).then(function (data) {
                return reporter.documentStore.collection("data").insert({ name: "en-data2", dataJson: "{ \"foo2\": \"x\"}"}).then(function (data2) {
                    var template = {
                        resources: {
                            items: [
                                {shortid: data.shortid, entitySet: "data"},
                                {shortid: data2.shortid, entitySet: "data"}
                            ]
                        }
                    };

                    var request = {template: template, options: {language: "en"}, data: {}};
                    return reporter.resources.handleBeforeRender(request, {}).then(function (response) {
                        request.data.should.have.property("$localizedResource");
                        request.data.$localizedResource.should.have.property("data1");
                        request.data.$localizedResource.should.have.property("data2");
                        request.data.$localizedResource.data1.should.have.property("foo");
                        request.data.$localizedResource.data2.should.have.property("foo2");

                        done();
                    });
                });
            }).catch(done);
        });
    });
});


