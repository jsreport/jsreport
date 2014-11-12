describe('templates', function () {
    this.timeout(5000);

    var originalDataContext;

    beforeEach(function (done) {
        window.location.hash = "";
        ensureStarted(function() {
            require(["app"], function(app) {
                originalDataContext = app.dataContext;
                done();
            });
        });
    });

    afterEach(function(done) {
        require(["app"], function(app) {
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

    describe("navigation", function() {
        it('navigating to playground should open page', function (done) {
            window.location.hash = "/playground";

            expect("#previewCommand").to.be.shown(done);
        });
    });


    it('saving should validate empty name', function (done) {
        window.location.hash = "/playground";

        expect("#saveCommand").to.be.shown(function() {
            $("#saveCommand").click();

            expect().to.evaluate(function() {
                return $("#errorDialog").find("#dialogHeader").html() === "Validations";
            }, done);
        });
    });

    it('saving should trigger jaydata', function (done) {
        require(["app"], function(app) {

            app.dataContext = {
                data: { toArray: sinon.stub().returns($.Deferred().resolve([])) },
                scripts: { toArray: sinon.stub().returns($.Deferred().resolve([])) },
                templates: { add: sinon.stub()},
                saveChanges : function() {
                    done();
                    return $.Deferred().resolve();
                }
            };

            window.location.hash = "/playground";

            expect(".title-edit").to.be.shown(function() {
                $(".title-edit").click();
                $(".title-input").val("test").change();
                $(".title-confirm").val("test");
                $("#saveCommand").click();
            });
        });
    });

});


