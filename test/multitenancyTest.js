var fs = require("fs"),
    Buffer = require("buffer").Buffer,
    assert = require("assert"),
    connect = require("connect"),
    request = require('supertest'),
    multitenancy = require('../multitenancy.js'),
    express = require("express"),
    MongoClient = require('mongodb').MongoClient,
    path = require("path"),
    extend = require("node.extend"),
    should = require("should"),
    serveStatic = require('serve-static');

describe('multitenancy with testing account', function() {
    this.timeout(60000);

    var app;
    var options;
    var registrationResponse;

    beforeEach(function(done) {
        app = express();
        app.use(require("body-parser")());
        app.use(require("method-override")());
        var sessions = require("client-sessions");
        app.use(sessions({
            cookieName: 'session',
            cookie: { domain: "local.net"},
            secret: "foo",
            duration: 1000 * 60 * 60 * 24 * 365 * 10, // forever
        }));
        app.use(serveStatic(path.join(__dirname, 'views')));
        app.engine('html', require('ejs').renderFile);

        options = {
            connectionString: { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 },
            extensions: ["templates", "express"],
            useSubDomains: true,
            subdomainsCount: 3,
            rootDirectory: path.join(__dirname, "../")
        };

        MongoClient.connect('mongodb://127.0.0.1:27017/test', {}, function(err, db) {
            db.dropDatabase(function() {


                registrationResponse = multitenancy(app, options, function() {
                    request(app).post('/register')
                        .type('form')
                        .send({ username: "test@test.cz", name: "joj", password: "password", passwordConfirm: "password" })
                        .end(function(err, res) {
                            registrationResponse = res;
                            done();
                        });
                });
            });
        });
    });

    describe('with subdomain', function() {
        beforeEach(function() {
            options.useSubDomains = true;
        });


        it('should redirect to subdomain after registration', function(done) {
            request(app).get(registrationResponse.header.location)
                .set("cookie", registrationResponse.headers['set-cookie'])
                .end(function(err, res) {
                    res.text.should.include("joj.");
                    done();
                });
        });

        it('GET /  should work', function(done) {
            request(app).get('/').expect(200, done);
        });

        it('POST /login with invalid password should redirect to login', function(done) {
            request(app).post('/login')
                .type('form')
                .send({ username: "xxxx@test.cz" })
                .end(function(err, res) {
                    if (err) return done(err);
                    request(app).get(res.header.location)
                        .set("cookie", res.headers['set-cookie'])
                        .end(function(err, res) {
                            res.text.should.include("jsreport$login");
                            done();
                        });
                });

        });

        it('POST /login with valid password should redirect to subdomain', function(done) {
            request(app).post("/login")
                .type('form')
                .send({ username: "test@test.cz", password: "password" })
                .end(function(err, res) {
                    if (err) return done(err);
                    request(app).get(res.header.location)
                        .set("cookie", res.headers['set-cookie'])
                        .end(function(err, res) {
                            res.text.should.include("joj.");
                            done();
                        });
                });
        });

        it('POST /api should be able to start another reporter on another multitenancy instance', function(done) {
            multitenancy(app, options, function() {
                request(app)
                    .get('/api/version')
                    .set("host", "joj.local.net")
                    .set("cookie", registrationResponse.headers['set-cookie'])
                    .expect(200, done);
            });
        });
        
        it('GET /odata should response 401 for invalid credentials', function(done) {
            request(app).get("/odata/templates")
                .expect(401, done);
        });
    });


    describe('without subdomain', function() {
        beforeEach(function() {
            options.useSubDomains = false;
        });

        it('should redirect to studio after registration', function(done) {
            request(app).get(registrationResponse.header.location)
                .set("cookie", registrationResponse.headers['set-cookie'])
                .end(function(err, res) {
                    res.text.should.include("jsreport$studio");
                    done();
                });
        });

        it('GET / 200', function(done) {
            request(app).get('/').expect(200, done);
        });

        it('POST /login with invalid password should redirect to login', function(done) {
            request(app).post("/login")
                .type('form')
                .send({ username: "XXXXX@test.cz", password: "password" })
                .end(function(err, res) {
                    request(app).get(res.header.location)
                        .set("cookie", res.headers['set-cookie'])
                        .end(function(err, res) {
                            res.text.should.include("jsreport$login");
                            done();
                        });
                });
        });


        it('POST /login with valid password should go dashboard', function(done) {
            request(app).post("/login")
                .type('form')
                .send({ username: "test@test.cz", password: "password" })
                .end(function(err, res) {
                    if (err) return done(err);
                    request(app).get(res.header.location)
                        .set("cookie", res.headers['set-cookie'])
                        .end(function(err, res) {
                            res.text.should.include("jsreport$studio");
                            done();
                        });
                });


        });

        it('POST /api should be able to start another reporter on another multitenancy instance', function(done) {
            multitenancy(app, options, function() {
                request(app).get('/api/version')
                    .set("cookie", registrationResponse.headers['set-cookie'])
                    .expect(200, done);
            });
        });
    });
});