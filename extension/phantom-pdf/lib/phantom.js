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
    PhantomManager = require("phantom-workers").PhantomManager;

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

    reporter.documentStore.registerComplexType("PhantomType", {
        margin: {type: "Edm.String"},
        header: {type: "Edm.String"},
        headerHeight: {type: "Edm.String"},
        footer: {type: "Edm.String"},
        footerHeight: {type: "Edm.String"},
        orientation: {type: "Edm.String"},
        format: {type: "Edm.String"},
        width: {type: "Edm.String"},
        height: {type: "Edm.String"},
        printDelay: {type: "Edm.Int32"},
        blockJavaScript: {type: "Edm.Boolean"}
    });

    reporter.documentStore.model.entityTypes["TemplateType"].phantom = {type: "jsreport.PhantomType"};
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
        reporter.options.phantom.pathToPhantomScript = path.join(__dirname, "bridge.js");
        phantomManager = new PhantomManager(reporter.options.phantom);
        return phantomManager.start();
    }
};
