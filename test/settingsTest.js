/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    Settings = require("../lib/util/settings.js"),
    foo = require("odata-server"),
    DataProvider = require("../lib/dataProvider.js"),
    MongoClient = require('mongodb').MongoClient;


describe('Settings', function() {

    beforeEach(function(done) {
        var self = this;
        this.settings = new Settings();

        this.dataProvider = new DataProvider({ name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 }, { name: "trest"});
        this.settings.registerEntity(this.dataProvider);
        this.dataProvider.buildContext();

        this.dataProvider.startContext().then(function(context) {
            self.settings.init(context).then(function() {
                done();
            });
        });
    });

    afterEach(function(done) {
        this.timeout(10000);

        MongoClient.connect('mongodb://127.0.0.1:27017/test', {}, function(err, db) {
            db.dropDatabase(function() {
                done();
            });
        });
    });
    
    it('add update get should result into updated value', function(done) {
        var self = this;
        this.settings.add("test", "val").then(function() {
            self.settings.set("test", "modified").then(function() {
                assert.equal("modified", self.settings.get("test").value);
                done();
            });
        });
    });

    it('add and get should result into same value', function(done) {
        var self = this;
        this.settings.add("test", "val").then(function() {
            assert.equal("val", self.settings.get("test").value);
            done();
        });
    });
});