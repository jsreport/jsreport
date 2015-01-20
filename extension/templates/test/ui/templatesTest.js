describe('templates', function () {
    this.timeout(5000);

    var originalDataContext;

    beforeEach(function (done) {
        window.location.hash = "";

        ensureStarted(function () {
            require(["app"], function (app) {
                originalDataContext = app.dataContext;
                done();
            });
        });
    });

    afterEach(function (done) {
        require(["app"], function (app) {
            app.dataContext = originalDataContext;
            done();
        });
    });

    it('module should be ok', function (done) {
        require(["app"], function (app) {
            expect(app.template).to.be.ok();
            done();
        });
    });

    describe("navigation", function () {
        it('/playground should navigate to playground', function (done) {
            window.location.hash = "/playground";

            expect("#previewCommand").to.be.shown(done);
        });

        it('/extension/templates should navigate to list', function (done) {
            window.location.hash = "/extension/templates";
            expect("#templateGridBox").to.be.shown(done);
        });
    });

    describe("preview", function () {
        var preview;
        var app;
        var listenerCollection;
        var model;

        beforeEach(function(done) {
            require(["templates/template.preview", "app", "core/listenerCollection", "templates/template.model"], function(_preview, _app, ListenerCollection, Model) {
                preview = _preview;
                app = _app;
                listenerCollection = new ListenerCollection();
                model = new Model();
                done();
            });
        });

        afterEach(function(done) {
            app.off("preview-form-submit");
            done();
        });

        it("should submit form", function(done) {
            app.on("preview-form-submit", function(form) {
                done();
            });
            $("body").append("<iframe name='foo' />");
            preview(model, listenerCollection, "foo");
        });

        it("should add to submit basic attributes", function(done) {
            app.on("preview-form-submit", function(form) {
                expect(form.target).to.be.eql("foo");
                expect(form.method.toLowerCase()).to.be.eql("post");
                expect($(form).find("[name='template[content]']").val()).to.be.eql("xxx");
                expect($(form).find("[name='template[engine]']").val()).to.be.eql("jsrender");
                done();
            });
            $("body").append("<iframe name='foo' />");

            model.set("content", "xxx");
            model.set("engine", "jsrender");
            preview(model, listenerCollection, "foo");
        });

        it("should invoke before render listeners", function(done) {
            listenerCollection.fire = function(request, cb) {
                request.template.content = "modified";
                cb();
            };

            app.on("preview-form-submit", function(form) {
                expect($(form).find("[name='template[content]']").val()).to.be.eql("modified");
                done();
            });
            $("body").append("<iframe name='foo' />");
            preview(model, listenerCollection, "foo");
        });
    });

    describe("view", function () {

        var model;
        var view;
        var toolbarView;
        var app;

        function showDetail(item, cb) {
            require(["app", "templates/template.detail.view", "templates/template.model", "templates/template.detail.toolbar.view"],
                function (_app, DetailView, Model, ToolbarView) {
                    app = _app;
                    model = new Model(item);
                    view = new DetailView({model: model});
                    toolbarView = new ToolbarView({model: model});
                    app.layout.showToolbarViewComposition(view, toolbarView);

                    cb();
                });

        }

        afterEach(function(done) {
            app.off("template-extensions-render");
            app.off("toolbar-render");

            done();
        });

        it("save should trigger save on model", function(done) {
            showDetail({ name: "test" }, function() {
                model.save = function() {
                    expect(model.get("name")).to.be.eql("test");
                    done();
                };

                toolbarView.save();
            });
        });

        it("save without name should validate for empty name", function(done) {
            showDetail({}, function() {
                model.save = function() {
                    throw new Error("model.save should not be called");
                };

                toolbarView.save();
                done();
            });
        });

        it("should trigger template-extensions-render during init", function(done) {

            app.on("template-extensions-render", function(context, cb) {
                expect(context.template).to.be.equal(model);
                expect(context.view).to.be.equal(toolbarView);
                done();
            });

            showDetail({}, function() {});
        });

        it("should trigger toolbar-render during init", function(done) {

            app.on("toolbar-render", function(context, cb) {
                expect(context.model).to.be.equal(model);
                expect(context.view).to.be.equal(toolbarView);
                done();
            });

            showDetail({}, function() {});
        });

        it("preview should invoke preview module", function (done) {
            require.undef("templates/template.detail.toolbar.view");
            require.undef("templates/template.preview");

            define("templates/template.preview", function() {
                return function(m, listeners, target) {
                    expect(m).to.be.equal(model);
                    done();
                };
            });

            showDetail({name: "test"}, function () {
                toolbarView.preview();
            });
        });

        //it('saving should trigger jaydata', function (done) {
        //    require(["app"], function (app) {
        //
        //        app.dataContext = {
        //            data: {toArray: sinon.stub().returns($.Deferred().resolve([]))},
        //            scripts: {toArray: sinon.stub().returns($.Deferred().resolve([]))},
        //            templates: {add: sinon.stub()},
        //            saveChanges: function () {
        //                done();
        //                return $.Deferred().resolve();
        //            }
        //        };
        //
        //        window.location.hash = "/playground";
        //
        //        expect(".title-edit").to.be.shown(function () {
        //            $(".title-edit").click();
        //            $(".title-input").val("test").change();
        //            $(".title-confirm").val("test");
        //            $("#saveCommand").click();
        //        });
        //    });
        //});
    });
});


