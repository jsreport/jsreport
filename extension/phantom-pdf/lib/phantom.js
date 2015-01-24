/*! 
 * Copyright(c) 2014 Jan Blaha 
 * 
 * Recipe rendering pdf files using phantomjs.  
 */

var uuid = require("uuid").v1,
    path = require("path"),
    join = path.join,
    fs = require("fs"),
    _ = require("underscore"),
    q = require("q"),
    FS = require("q-io/fs"),
    extend = require("node.extend"),
    mkdirp = require('mkdirp'),
    toArray = require('stream-to-array'),
    PhantomManager = require("./phantomManager.js");

var phantomManager;

var Phantom = function (reporter, definition) {
    this.reporter = reporter;

    reporter.options.phantom = reporter.options.phantom || {};
    this.allowLocalFilesAccess = reporter.options.phantom.hasOwnProperty("allowLocalFilesAccess") ?
        reporter.options.phantom.allowLocalFilesAccess : false;

    reporter.extensionsManager.recipes.push({
        name: "phantom-pdf",
        execute: Phantom.prototype.execute.bind(this)
    });

    this.PhantomType = this.reporter.dataProvider.createEntityType("PhantomType", {
        margin: {type: "string"},
        header: {type: "string"},
        headerHeight: {type: "string"},
        footer: {type: "string"},
        footerHeight: {type: "string"},
        orientation: {type: "string"},
        format: {type: "string"},
        width: {type: "string"},
        height: {type: "string"},
        printDelay: {type: "int"},
        blockJavaScript: {type: "boolean"}
    });

    reporter.templates.TemplateType.addMember("phantom", {type: this.PhantomType});

    var self = this;
    reporter.templates.TemplateType.addEventListener("beforeCreate", function (args, template) {
        template.phantom = template.phantom || new (self.PhantomType)();
    });
};

Phantom.prototype.execute = function (request, response) {
    var self = this;
    request.template.phantom = request.template.phantom || {};
    this.reporter.logger.debug("Pdf recipe start.");

    var phantomOptions = request.template.phantom || new self.PhantomType();
    phantomOptions = phantomOptions.initData || phantomOptions;
    phantomOptions.allowLocalFilesAccess = this.allowLocalFilesAccess;
    phantomOptions.blockJavaScript = phantomOptions.blockJavaScript === 'true' || phantomOptions.blockJavaScript === true;

    var generationId = uuid();
    var htmlFile = join(request.reporter.options.tempDirectory, generationId + ".html");
    var pdfFile = join(request.reporter.options.tempDirectory, generationId + ".pdf");

    request.template.recipe = "html";
    request.options.isRootRequest = false;
    return this.reporter.executeRecipe(request, response)
        .then(function () {
            return FS.write(htmlFile, response.result);
        })
        .then(function () {
            return self._processHeaderFooter(phantomOptions, request, generationId, "header");
        })
        .then(function () {
            return self._processHeaderFooter(phantomOptions, request, generationId, "footer");
        })
        .then(function () {
            return phantomManager.execute({
                url: phantomOptions.url || "file:///" + encodeURIComponent(path.resolve(htmlFile)),
                output: path.resolve(pdfFile),
                options: phantomOptions
            });
        }).then(function (numberOfPages) {
                request.options.isRootRequest = true;
                response.result = fs.createReadStream(pdfFile);
                response.headers["Content-Type"] = "application/pdf";
                response.headers["Content-Disposition"] = "inline; filename=\"report.pdf\"";
                response.headers["File-Extension"] = "pdf";
                response.headers["Number-Of-Pages"] = numberOfPages;
        }).then(function() {
            return q.nfcall(toArray, response.result).then(function (arr) {
                response.result = Buffer.concat(arr);
                self.reporter.logger.debug("Rendering pdf end.");
            });
        });
};

Phantom.prototype._processHeaderFooter = function (phantomOptions, request, generationId, type) {
    if (!phantomOptions[type])
        return q(null);

    var req = extend(true, {}, request);
    req.template = {content: phantomOptions[type], recipe: "html", helpers: request.template.helpers, engine: request.template.engine};
    req.data = extend(true, {}, request.data);
    req.options.isRootRequest = false;

    return this.reporter.render(req).then(function (resp) {
        var filePath = join(request.reporter.options.tempDirectory, generationId + "-" + type + ".html");
        return FS.write(filePath, resp.result).then(function () {
            phantomOptions[type + "File"] = path.resolve(filePath);
        });
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Phantom(reporter, definition);

    if (!fs.existsSync(reporter.options.tempDirectory)) {
        mkdirp.sync(reporter.options.tempDirectory);
    }

    if (!phantomManager) {
        phantomManager = new PhantomManager(reporter.options.phantom);
        return phantomManager.start();
    }
};
