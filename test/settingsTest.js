var assert = require("assert"),
    Settings = require("../settings.js"),
    foo = require("odata-server"),
    Q = require("q"),
    MongoClient = require('mongodb').MongoClient;


describe('Settings', function() {

    beforeEach(function(done) {
        var self = this;
        this.settings = new Settings();
        var entitySets = {};
        this.contextDefinition = $data.Class.defineEx("$entity.Context", [$data.EntityContext, $data.ServiceBase], null, this.settings.createEntitySetDefinitions(entitySets));
        this.context = new this.contextDefinition({ name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 });
        this.context.onReady(function() {
            self.settings.init(self.context).then(function() {
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