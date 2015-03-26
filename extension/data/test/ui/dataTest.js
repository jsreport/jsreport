describe('data', function () {
    this.timeout(5000);

    beforeEach(function (done) {
        window.location.hash = "";
        ensureStarted(done);
    });

    describe('nagivation', function () {
        it('/extension/data/list should go to list', function (done) {
            window.location.hash = "/extension/data/list";
            expect("#schemaGridBox").to.be.shown(done);
        });

        it('/extension/data/detail should go to detail', function (done) {
            window.location.hash = "/extension/data/detail";
            expect("#contentWrap").to.be.shown(done);
        });
    });

    describe('list', function() {

        function showList(items, cb) {
            require(["app", "data/data.list.model", "data/data.list.view", "data/data.list.toolbar.view"],
                function (app, ListModel, ListView, ListToolbarView) {

                    var model = new ListModel(items);
                    var listView = new ListView({ collection: model});
                    var listToolbarView = new ListToolbarView({ collection: model });
                    app.layout.showToolbarViewComposition(listView, listToolbarView);

                    cb();
                });
        }

        it("with no data should render wrapper", function(done) {
            showList([], function() {
                expect("#schemaGridBox").to.be.shown(done);
            });
        });

        it("with one model should render one row", function(done) {
            showList([ { name: "test-data"} ], function() {
                expect("a:contains('test-data')").to.be.shown(done);
            });
        });
    });

    describe('detail view', function() {
        var model;
        var view;
        var toolbarView;
        var app;
        function showDetail(item, cb) {
            require(["app", "data/data.detail.view", "data/data.model", "data/data.toolbar.view"],
                function (_app, DetailView, Model, ToolbarView) {
                    app = _app;
                    model = new Model(item);
                    view = new DetailView({ model: model});
                    toolbarView = new ToolbarView({ model: model });
                    app.layout.showToolbarViewComposition(view, toolbarView);

                    cb();
                });
        }

        it("save should trigger save on model", function(done) {
            showDetail({ name: "test", dataJson: "{}"}, function() {
                model.save = function() {
                    expect(model.get("name")).to.be.eql("test");
                    expect(model.get("dataJson")).to.be.eql("{}");
                    done();
                };

                toolbarView.save();
            });
        });

        it("save without name should validate for empty name", function(done) {
            showDetail({ dataJson: "{}"}, function() {
                model.save = function() {
                    throw new Error("model.save should not be called");
                };

                toolbarView.save();
                done();
            });
        });

        it("save with invalid json should validated", function(done) {
            showDetail({ name: "foo", dataJson: "foo"}, function() {
                model.save = function() {
                    throw new Error("model.save should not be called");
                };

                toolbarView.save();
                done();
            });
        });
    });

    describe('model', function () {
        var SUT;
        var templateModel;
        var app;

        beforeEach(function (done) {
            require(["app", "data/data.template.model", "templates/template.model"], function (_app, Model, TemplateModel) {
                app = _app;
                SUT = new Model();
                templateModel = new TemplateModel();
                SUT.setTemplate(templateModel);
                done();
            });
        });

        afterEach(function (done) {
            require(["app"], function (app) {
                done();
            });
        });

        it("fetch should add default items", function (done) {
            app.dataProvider.get = sinon.stub().returns($.Deferred().resolve([]));
            SUT.fetch().then(function () {
                expect(SUT.items.length).to.be.eql(1);
                expect(SUT.get("shortid")).to.be.eql(null);
                done();
            });
        });

        it("fetch should select proper item based on template.data.shortid", function (done) {
            templateModel.set("data", {shortid: "foo"});
            app.dataProvider.get = sinon.stub().returns($.Deferred().resolve([{shortid: "foo"}]));

            SUT.fetch().then(function () {
                expect(SUT.get("shortid")).to.be.eql("foo");
                done();
            });
        });

        it("changing shortid should propagate changes to template and reload selected object", function (done) {
            app.dataProvider.get = sinon.stub().returns($.Deferred().resolve([{
                        shortid: "foo",
                        dataJson: "{}"
                    }]));

            SUT.fetch().then(function () {
                SUT.set("shortid", "foo");
                expect(templateModel.get("data").shortid).to.be.eql("foo");
                expect(SUT.get("dataJson")).to.be.eql("{}");
                done();
            });
        });
    });
});
