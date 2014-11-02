describe('templates', function () {
    this.timeout(5000);

    beforeEach(function (done) {
        window.location.hash = "";
        ensureStarted(done);
    });

//    it('template module should be ok', function (done) {
//        require(["app"], function (app) {
//            expect(app.template).to.be.ok();
//            done();
//        });
//    });
//
//    it('navigating to playground should open page', function (done) {
//        window.location.hash = "/playground";
//
//        expect("#previewCommand").to.be.shown(done);
//    });
//
//    it('saving should validate empty name', function (done) {
//        window.location.hash = "/playground";
//        $("#saveCommand").click();
//
//        expect().to.evaluate(function() {
//            return $("#errorDialog").find("#dialogHeader").html() === "Validations";
//        }, done);
//    });

    it('saving should trigger jaydata', function (done) {
        require(["app"], function(app) {

            sinon.stub(app.dataContext, "data", {});

//            app.dataContext = sinon.mock({
//                saveChanges: function() {
//                    console.log("in mock");
//                    return $.Deferred();
//                }
//            });

            window.location.hash = "/playground";

            expect(".title-edit").to.be.shown(function() {
                $(".title-edit").click();
                $(".title-input").val("test");
                $(".title-confirm").val("test");
                $("#saveCommand").click();
            });

        });
    });

});


