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

    describe('model', function () {
        var originalDataContext;
        var SUT;
        var templateModel;
        var app;

        beforeEach(function (done) {
            require(["app", "data/data.template.model", "templates/template.model"], function (_app, Model, TemplateModel) {
                originalDataContext = _app.dataContext;

                app = _app;
                SUT = new Model();
                templateModel = new TemplateModel();
                SUT.setTemplate(templateModel);
                done();
            });
        });

        afterEach(function (done) {
            require(["app"], function (app) {
                app.dataContext = originalDataContext;
                done();
            });
        });

        it("fetch should add default items", function (done) {
            app.dataContext = {data: {toArray: sinon.stub().returns($.Deferred().resolve([]))}};
            SUT.fetch().then(function () {
                expect(SUT.items.length).to.be.eql(2);
                expect(SUT.get("shortid")).to.be.eql("custom");
                done();
            });
        });

        it("fetch should select proper item based on template.data.shortid", function (done) {
            templateModel.set("data", {shortid: "foo"});
            app.dataContext = {data: {toArray: sinon.stub().returns($.Deferred().resolve([new $entity.DataItem({shortid: "foo"})]))}};

            SUT.fetch().then(function () {
                expect(SUT.get("shortid")).to.be.eql("foo");
                done();
            });
        });

        it("changing shortid should propagate changes to template and reload selected object", function (done) {
            app.dataContext = {
                data: {
                    toArray: sinon.stub().returns($.Deferred().resolve([new $entity.DataItem({
                        shortid: "foo",
                        dataJson: "{}"
                    })]))
                }
            };

            SUT.fetch().then(function () {
                SUT.set("shortid", "foo");
                expect(templateModel.get("data").shortid).to.be.eql("foo");
                expect(SUT.get("dataJson")).to.be.eql("{}");
                done();
            });
        });
    });
});
