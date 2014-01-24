describe('foo', function () {
    it('should not fail', function (done) {
        require(["marionette", "../../test/ui/squire"], function(Marionette, Squire) {
            var injector = new Squire();
            var appMock = new Marionette.Application();
            appMock.serverUrl = "testChange";

            injector.mock('app', appMock)
                .require(['app', "layout"], function(app, Layout) {
                    //expect.eql(app.serverUrl, "testChange5");
                    expect(app.serverUrl).to.be.eql('testChange');
                    done();
                });
        });
            
            
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