/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    fs = require("fs"),
    events = require("events"),
    util = require("util"),
    fork = require('child_process').fork,
    sformat = require("stringformat"),
    async = require("async"),
    _ = require("underscore"),
    Q = require("q");
join = require("path").join;



var logger = winston.loggers.get('jsreport');

module.exports = function(reporter, definition) {
    reporter[definition.name] = new Images(reporter, definition);
};

Images = function(reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    Object.defineProperty(this, "entitySet", {
        get: function() {
            return reporter.context.images;
        }
    });

    this._defineEntities();

    reporter.templates.TemplateType.addEventListener("beforeCreate", function(args, template) {
        template.images = template.images || [];
    });
    
    this.ImageType.addEventListener("beforeCreate", function(args, entity) {
        entity.creationDate = new Date();
        entity.modificationDate = new Date();
    });
    
    this.ImageType.addEventListener("beforeUpdate", function(args, entity) {
        entity.modificationDate = new Date();
    });

    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, Images.prototype._createEntitySetDefinitions.bind(this));
    this.reporter.on("express-configure", Images.prototype._configureExpress.bind(this));

    this.reporter.initializeListener.add(definition.name, this, function() {
        //when activated we need to initialze images field with default values, otherwise jaydata has problems with null aray
        return reporter.context.templates.toArray().then(function(res) {
            res.forEach(function(t) {
                if (t.images == null) {
                    reporter.context.templates.attach(t);
                    t.images = [];
                }
            });

            reporter.context.templates.updateEnabled = true;
            return reporter.context.templates.saveChanges().then(function() {
                reporter.context.templates.updateEnabled = false;
                return Q();
            });
        });
    });
};

Images.prototype.upload = function(name, contentType, content, shortidVal) {
    var self = this;
    logger.info("uploading image " + name);
    function findOrCreate() {
        if (shortidVal == null) {
            var image = new self.ImageType({
                name: name,
                contentType: contentType,
                content: content,
                shortid: shortid.generate()
            });
            self.entitySet.add(image);
            return Q(image);
        } else {
            return self.entitySet.single(function(i) { return i.shortid == this.id; }, { id: shortidVal }).then(function(img) {
                self.entitySet.attach(img);
                img.content = content;
                img.contentType = contentType;
                img.name = name;
                return Q(img);
            });
        }
    };

    return findOrCreate().then(function(img) {
        return self.entitySet.saveChanges().then(function() {
            return Q(img);
        });
    });
};

Images.prototype._configureExpress = function(app) {
    var self = this;

    app.get("/api/image/:shortid", function(req, res, next) {

        self.entitySet.single(function(t) { return t.shortid == this.id; }, { id: req.params.shortid }, function(result) {
            res.setHeader('Content-Type', result.contentType);
            res.send(result.content);
        });
    });
    
    app.get("/api/image/name/:name", function(req, res, next) {

        self.entitySet.single(function(t) { return t.name == this.name; }, { name: req.params.name }, function(result) {
            res.setHeader('Content-Type', result.contentType);
            res.send(result.content);
        });
    });

    app.post("/api/image/:shortid?", function(req, res, next) {
        for (var f in req.files) {
            var file = req.files[f];
            fs.readFile(file.path, function(err, content) {
                var name = file.name.replace(/\.[^/.]+$/, "");
                name = name.replace(/[^a-zA-Z0-9-_]/g, '');
                self.upload(name, file.type, content, req.params.shortid).then(function(image) {
                    res.setHeader('Content-Type', "text/plain");
                    var result = JSON.stringify({ _id: image._id, shortid: image.shortid, name: name, "success": true });
                    logger.info("Uploading done. " + result);
                    res.send(result);
                });
            });
        }
    });
};

Images.prototype._defineEntities = function() {
    this.ImageType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.Image"), $data.Entity, null, {
        "_id": { type: "id", key: true, computed: true, nullable: false },
        "shortid": { type: "string" },
        "name": { type: "string" },
        "creationDate": { type: "date" },
        "modificationDate": { type: "date" },
        "content": { type: "blob" },
        "contentType": { type: "string" },
    }, null);

    this.ImageRefType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.ImageRef"), $data.Entity, null, {
        "shortid": { type: "string" },
        "name": { type: "string" },
        "imageId": { type: "id" }
    }, null);

    this.reporter.templates.TemplateType.addMember("images", { type: "Array", elementType: this.ImageRefType });

    if (!this.reporter.playgroundMode) {
        this.reporter.templates.TemplateHistoryType.addMember("images", { type: "Array", elementType: this.ImageRefType });
    }
};

Images.prototype._createEntitySetDefinitions = function(entitySets) {
    entitySets["images"] = { type: $data.EntitySet, elementType: this.ImageType };
};