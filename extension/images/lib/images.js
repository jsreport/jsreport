/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Images extension allows to upload images into data storage and reference them from the templates
 */

var shortid = require("shortid"),
    fs = require("fs"),
    _ = require("underscore"),
    q = require("q"),
    asyncReplace = require("async-replace"),
    join = require("path").join;

var Images = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this._defineEntities();

    this.reporter.on("express-configure", Images.prototype._configureExpress.bind(this));
    this.reporter.afterTemplatingEnginesExecutedListeners.add(definition.name, this, Images.prototype.handleAfterTemplatingEnginesExecuted.bind(this));
};

Images.prototype.upload = function (name, contentType, content, shortidVal) {
    var self = this;
    this.reporter.logger.info("uploading image " + name);

    if (!shortidVal) {
        return self.imagesCollection.insert({
            name: name,
            contentType: contentType,
            content: content
        });
    } else {
        return self.imagesCollection.find({"shortid": shortidVal}).then(function(res) {
            return self.imagesCollection.update(
                {
                    "shortid": shortidVal
                }, {
                    $set: {
                        content: content,
                        name: name,
                        contentType: contentType
                    }
                }).then(function() {
                    return res[0];
                });
        });
    }
};

Images.prototype.handleAfterTemplatingEnginesExecuted = function (request, response) {
    var self = this;
    var replacedImages = [];

    function convert(str, p1, offset, s, done) {
        self.imagesCollection.find({ name: p1}).then(function(result) {
            if (result.length < 1)
                return done(null);

            replacedImages.push(p1);

            var imageData = "data:" + result[0].contentType + ";base64," + result[0].content.toString('base64');
            done(null, imageData);
        }).catch(done);
    }

    var test = /{#image ([^{}]{0,50})}/g;

    return q.nfcall(asyncReplace, response.result, test, convert).then(function (result) {
        self.reporter.logger.debug("Replaced images " + JSON.stringify(replacedImages));
        response.result = result;
    });
};

Images.prototype._configureExpress = function (app) {
    var self = this;

    app.get("/api/image/:shortid", function (req, res, next) {
        self.imagesCollection.find({shortid: req.params.shortid}).then(function(result) {
            if (result.length !== 1)
                throw new Error("Image not found");

            res.setHeader('Content-Type', result[0].contentType);
            res.end(result[0].content, "binary");
        }).catch(function(e) {
            res.status(404).end();
        });
    });

    app.get("/api/image/name/:name", function (req, res) {
        self.imagesCollection.find({name: req.params.name}).then(function(result) {
            if (result.length !== 1)
                throw new Error("Image not found");

            res.setHeader('Content-Type', result[0].contentType);
            res.end(result[0].content, "binary");
        }).catch(function(e) {
            res.status(404).end();
        });
    });

    app.post("/api/image/:shortid?", function (req, res, next) {

        function findFirstFile() {
            for (var f in req.files) {
                if (req.files.hasOwnProperty(f)) {
                    return req.files[f];
                }
            }
        }

        var file = findFirstFile();

        fs.readFile(file.path, function (err, content) {
            var name = file.originalname.replace(/\.[^/.]+$/, "");
            name = name.replace(/[^a-zA-Z0-9-_]/g, '');
            self.upload(name, file.mimetype, content, req.params.shortid).then(function (image) {
                res.setHeader('Content-Type', "text/plain");
                var result = JSON.stringify({_id: image._id, shortid: image.shortid, name: name, "success": true});
                self.reporter.logger.info("Uploading done. " + result);
                res.send(result);
            }).catch(next);
        });
    });
};

Images.prototype._defineEntities = function () {
    this.ImageType = this.reporter.documentStore.registerEntityType("ImageType", {
        _id: {type: "Edm.String", key: true},
        "shortid": {type: "Edm.String"},
        "name": {type: "Edm.String"},
        "creationDate": {type: "Edm.DateTimeOffset"},
        "modificationDate": {type: "Edm.DateTimeOffset"},
        "content": {type: "Edm.Binary"},
        "contentType": {type: "Edm.String"}
    });

    this.ImageRefType = this.reporter.documentStore.registerComplexType("ImageRefType", {
        "shortid": {type: "Edm.String"},
        "name": {type: "Edm.String"},
        "imageId": {type: "Edm.String"}
    });

    this.reporter.documentStore.model.entityTypes["TemplateType"].images = {type: "Collection(jsreport.ImageRefType)"};
    this.reporter.documentStore.model.entityTypes["TemplateHistoryType"].images = {type: "Collection(jsreport.ImageRefType)"};
    this.reporter.documentStore.registerEntitySet("images", {entityType: "jsreport.ImageType", humanReadableKey: "shortid"});

    var self = this;
    this.reporter.initializeListener.add("images", function () {
        var col = self.imagesCollection = self.reporter.documentStore.collection("images");
        col.beforeUpdateListeners.add("images", function (query, update) {
            update.$set.modificationDate = new Date();
        });
        col.beforeInsertListeners.add("images", function (doc) {
            doc.shortid = doc.shortid || shortid.generate();
            doc.creationDate = new Date();
            doc.modificationDate = new Date();
        });
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Images(reporter, definition);
};