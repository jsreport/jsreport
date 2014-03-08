var assert = require("assert"),
    //Reporter = require("reporter");
    path = require("path"),
    Q = require("q"),
    sinon = require("sinon"),
    proxyquire = require('proxyquire');

describe('ExtensionsManager', function () {
    var templates;
    var settings;
    
    beforeEach(function () {
        var stub = {};
        templates = sinon.spy();
        stub[path.join(__dirname, "../extension/templates/lib/templates.js")] = templates;
        var ExtensionsManager = proxyquire('../extensionsManager.js', stub);

        var reporter = {};
        settings = { get: function () { return null; }, add: function () { return Q(); }, set: function () { return Q(); } };
        var logger = { info: function () { } };
 
        var options = { extensions: ["templates"], loadExtensionsFromPersistedSetting: true, rootDirectory: path.join(__dirname, "../") };

        this.extensionsManager = new ExtensionsManager(reporter, settings, logger, options);
    });
     
    it('init should initialize default extensions when no settings found', function (done) {
        this.extensionsManager.init().then(function () {
            assert.equal(true, templates.called);
            done();
        });
    });
    
    it('init should use settings for default extensions if exist', function (done) {
        settings.get = function () { return { key: "", value: "" }; };
        
        this.extensionsManager.init().then(function () {
            assert.equal(false, templates.called);
            done();
        });
    });
});