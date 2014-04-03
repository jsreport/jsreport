/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Images extension allows to upload images into mongo and reference them from the templates
 */ 

var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    fs = require("fs"),
    sformat = require("stringformat"),
    _ = require("underscore"),
    Q = require("q"),
    asyncReplace = require("async-replace"),
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

    this.reporter.entitySetRegistrationListners.add(definition.name, this, Images.prototype._createEntitySetDefinitions.bind(this));
    this.reporter.on("express-configure", Images.prototype._configureExpress.bind(this));
    this.reporter.beforeRenderListeners.add(definition.name, this, Images.prototype.handleBeforeRender.bind(this));

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
    }

    ;

    return findOrCreate().then(function(img) {
        return self.entitySet.saveChanges().then(function() {
            return Q(img);
        });
    });
};

Images.prototype.handleBeforeRender = function(request, response) {


    function convert(str, p1, offset, s, done) {

        request.context.images.filter(function(t) { return t.name == this.name; }, { name: p1 }).toArray().then(function(res) {
            if (res.length < 1)
                return done(null);

            var imageData = "data:" + res[0].contentType + ";base64," + res[0].content.toString('base64');
            done(null, imageData);
        });
    }

    var test = /{#image ([^{}]+)+}/g;
    
    return Q.nfcall(asyncReplace, request.template.content, test, convert).then(function(result) {
        request.template.content = result;
    });
};

Images.prototype._configureExpress = function(app) {
    var self = this;
  
    app.get("/api/image/:shortid", function(req, res) {

        self.entitySet.single(function(t) { return t.shortid == this.id; }, { id: req.params.shortid }).then(function(result) {
            res.setHeader('Content-Type', result.contentType);
            res.send(result.content);
        }, function() {
            res.send(404);
        });
    });

    app.get("/api/image/name/:name", function(req, res) {
        self.entitySet.single(function(t) { return t.name == this.name; }, { name: req.params.name }).then(function(result) {
            res.setHeader('Content-Type', result.contentType);
            res.send(result.content);
        }, function() {
            res.send(404);
        });
    });

    app.post("/api/image/:shortid?", function(req, res) {
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
    entitySets["images"] = { type: $data.EntitySet, elementType: this.ImageType, tableOptions: { humanReadableKeys: [ "shortid"] }  };
};