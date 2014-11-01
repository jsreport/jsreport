describe('foo', function () {
    this.timeout(10000);


    it('should not fail', function (done) {
        startApplication(function(app, server) {
            require(["jquery"], function ($) {
                expect(app.template).to.be.ok();
                expect($("#createTemplateCommand").length).to.be(1);
                $("#createTemplateCommand")[0].click();
                done();
            });
        });

//        require(["marionette", "../" + "../../../test/ui/squire"], function(Marionette, Squire) {
//            var injector = new Squire();
//            var appMock = new Marionette.Application();
//            appMock.serverUrl = "testChange";
//
//            injector.mock('app', appMock)
//                .require(['app', "layout"], function(app, Layout) {
//                    //expect.eql(app.serverUrl, "testChange5");
//                    expect(app.serverUrl).to.be.eql('testChange');
//                    done();
//                });
//        });
            
            
        //    //var injector = new Squire();
        //    var appMock = new Marionette.Application();
        //    appMock.serverUrl = "testChange";
        //    done();

        //    //injector.mock('app', appMock)
        //    //  .require(['app', "core/extensions/module"], function (app, extensionsModule) {
        //    //      expect.eql(app.serverUrl, "testChange");
        //    //      done();
        //    //  });
        //});

    });
});