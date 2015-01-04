/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    q = require("q"),
    sinon = require("sinon"),
    proxyquire = require('proxyquire');

describe('ExtensionsManager', function () {
    var templates;
    var settings;

    beforeEach(function () {
        this.timeout(10000);
        var stub = {};
        templates = sinon.spy();
        stub[path.join(__dirname, "../extension/templates/lib/templates.js")] = templates;
        var ExtensionsManager = proxyquire('../lib/extensionsManager.js', stub);

        var reporter = {};
        settings = {
            get: function () {
                return null;
            }, add: function () {
                return q();
            }, set: function () {
                return q();
            }
        };
        var logger = {
            info: function () {
            }
        };

        var options = {
            extensions: ["templates"],
            loadExtensionsFromPersistedSetting: true,
            rootDirectory: path.join(__dirname, "../")
        };
        this.extensionsManager = new ExtensionsManager(reporter, settings, logger, options);
    });

    it('init should initialize default extensions', function (done) {
        this.timeout(10000);
        this.extensionsManager.init().then(function () {
            assert.equal(true, templates.called);
            done();
        }, done);
    });
});