var assert = require("assert"),
    Reporter = require("../reporter.js"),
    fs = require('fs'),
    path = require("path"),
    util = require("../util.js"),
    describeReporting = require("./helpers.js").describeReporting;

describeReporting([], function (reporter) {
    
    describe('reporter', function () {

        afterEach(function () {
            util.deleteFiles("reports");
        });

        it('should render html', function (done) {
            reporter.render({ template : { html: "Hey", engine: "handlebars", recipe: "html" } }, function (err, resp) {
                assert.equal("Hey", resp.result);
                done();
            });
        });

        //it('should callback error when invalid template', function (done) {
        //    reporter.render({ html: "Hey {{{{}", engine: "handlebars" }, null, { recipe: "html" }, function (err, html) {
        //        assert.notEqual(null, err);
        //        done();
        //    });
        //});

        //it('should render html from template', function (done) {
        //    var self = this;

        //    this.reporter.templates.create( { name: "test", html: "html", engine: "handlebars" }, function (err, tmpl) {
        //        self.reporter.render({ _id: tmpl._id }, null, { recipe: "html" }, function (err, response) {
        //            assert.ifError(err);
        //            assert.equal("html", response.result);
        //            done();
        //        });
        //    });
        //});

        //it('should render html from template with conditional options', function (done) {
        //    var self = this;

        //    this.reporter.templates.create( { name: "test", html: "html", engine: "handlebars" }, function (err, tmpl) {
        //        self.reporter.render({ _id: tmpl._id }, null, function (err, response) {
        //            assert.ifError(err);
        //            assert.equal("html", response.result);
        //            done();
        //        });
        //    });
        //});

        //it('should render pdf', function (done) {
        //    this.reporter.render({ html: "Hey", engine: "handlebars" }, null, { recipe: "phantomPdf" }, function (err, resp) {
        //        assert.ifError(err);
        //        done();
        //    });
        //});

        //it('should get recipes', function (done) {
        //    this.reporter.getRecipes(function (err, recipes) {
        //        assert.equal(true, recipes.length > 2);
        //        done();
        //    });
        //});

        //it('should get engines', function (done) {
        //    reporter.getEngines(function (err, engines) {
        //        assert.equal(2, engines.length);
        //        assert.equal("handlebars", engines[0]);
        //        assert.equal("jsrender", engines[1]);
        //        done();
        //    });
        //});
    });

});